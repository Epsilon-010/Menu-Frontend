import { ArrowLeftIcon } from '@phosphor-icons/react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { accountRole, homePathFor, LoginError } from '../features/auth/api.ts'
import {
  BUSINESS_NAME_MAX_LENGTH,
  businessNameError,
  credentialsError,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  RegisterError,
  signUpDraftKey,
} from '../features/auth/register.ts'
import { useAuth } from '../features/auth/useAuth.ts'
import { browserTimeZone } from '../features/stats/logic.ts'
import { createDraftIds } from '../shared/api/idempotency.ts'
import { AuthLayout, AuthLogo } from '../shared/ui/AuthLayout.tsx'
import { Button } from '../shared/ui/Button.tsx'
import { buttonClass } from '../shared/ui/classes.ts'
import { Field, TextInput } from '../shared/ui/Field.tsx'
import { ErrorText } from '../shared/ui/Feedback.tsx'

type Step = 'credentials' | 'business'

interface Errors {
  email?: string
  password?: string
  business?: string
  form?: string
}

const LINK = 'font-medium text-zinc-950 underline underline-offset-4 hover:text-zinc-600'

/** Self sign-up of a business: email and password, then the business name, then the admin panel. */
export function RegisterPage() {
  const { state, register } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  // One client id per email and password: a retry after a lost answer signs in to the account already made.
  const [drafts] = useState(() => createDraftIds())

  if (state.status === 'authenticated') {
    return <Navigate to={homePathFor(accountRole(state.account))} replace />
  }

  function handleContinue() {
    const failure = credentialsError(email, password)
    if (failure) {
      setErrors({ [failure.field]: failure.message })
      return
    }
    setErrors({})
    setStep('business')
  }

  async function handleCreate() {
    const nameFailure = businessNameError(businessName)
    if (nameFailure) {
      setErrors({ business: nameFailure })
      return
    }
    setSubmitting(true)
    setErrors({})
    const trimmedEmail = email.trim()
    try {
      const role = await register({
        id: drafts.idFor(signUpDraftKey(trimmedEmail, password, businessName)),
        email: trimmedEmail,
        password,
        business_name: businessName.trim(),
        timezone: browserTimeZone(),
      })
      drafts.reset()
      navigate(homePathFor(role), { replace: true })
    } catch (caught) {
      setSubmitting(false)
      if (caught instanceof RegisterError) {
        if (caught.newIdNeeded) drafts.reset()
        if (caught.field === 'email') {
          setStep('credentials')
          setErrors({ email: caught.message })
        } else {
          setErrors({ form: caught.message })
        }
      } else if (caught instanceof LoginError) {
        // The business exists; only loading the new session failed.
        drafts.reset()
        setErrors({ form: 'Your business is ready, but it could not be opened here. Sign in with your email and password.' })
      } else {
        setErrors({ form: 'Something went wrong. Please try again.' })
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (step === 'credentials') handleContinue()
    else void handleCreate()
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} noValidate className="w-full max-w-sm space-y-6">
        <div className="space-y-2">
          <AuthLogo />
          <p className="text-xs font-medium text-zinc-500">Step {step === 'credentials' ? 1 : 2} of 2</p>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-950">
            {step === 'credentials' ? 'Create your business' : 'Name your business'}
          </h2>
          <p className="text-sm text-zinc-500">
            {step === 'credentials'
              ? 'You sign in as the manager with this email and password.'
              : 'Guests see this name on the menu. You can add tables, staff and dishes right after.'}
          </p>
        </div>

        {step === 'credentials' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Field label="Email">
                <TextInput
                  type="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                  aria-invalid={errors.email !== undefined}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Field>
              {errors.email && <ErrorText>{errors.email}</ErrorText>}
            </div>
            <div className="space-y-2">
              <Field label="Password" hint={`${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters.`}>
                <TextInput
                  type="password"
                  autoComplete="new-password"
                  maxLength={PASSWORD_MAX_LENGTH}
                  aria-invalid={errors.password !== undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </Field>
              {errors.password && <ErrorText>{errors.password}</ErrorText>}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="Business name">
              <TextInput
                type="text"
                autoComplete="organization"
                autoFocus
                maxLength={BUSINESS_NAME_MAX_LENGTH}
                placeholder="Taqueria 1"
                aria-invalid={errors.business !== undefined}
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </Field>
            {errors.business && <ErrorText>{errors.business}</ErrorText>}
          </div>
        )}

        {errors.form && <ErrorText>{errors.form}</ErrorText>}

        <div className="space-y-2">
          <button
            type="submit"
            disabled={submitting || state.status === 'loading'}
            className={`w-full ${buttonClass('primary', 'md')}`}
          >
            {step === 'credentials' ? 'Continue' : submitting ? 'Creating your business…' : 'Create my business'}
          </button>
          {step === 'business' && (
            <Button
              variant="ghost"
              className="w-full"
              icon={<ArrowLeftIcon size={16} aria-hidden />}
              disabled={submitting}
              onClick={() => {
                setErrors({})
                setStep('credentials')
              }}
            >
              Back
            </Button>
          )}
        </div>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className={LINK}>
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
