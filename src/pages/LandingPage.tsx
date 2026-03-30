import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Cpu, ShieldCheck, Sparkles } from 'lucide-react'
import { TopNav } from '@/components/layout/TopNav'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/TextField'
import { register as registerApi } from '@/features/auth/auth.api'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api/client'
import { safePostLoginPath } from '@/lib/utils/safeRedirect'

type Mode = 'login' | 'register'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1 },
  },
}

const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, duration: 0.5, bounce: 0.2 } },
}

export function LandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, login } = useAuth()

  const authLocationState = location.state as { from?: string; openAuth?: boolean } | null
  const initialOpen = Boolean(authLocationState?.openAuth)
  const [open, setOpen] = useState(initialOpen)
  const [mode, setMode] = useState<Mode>('login')

  useEffect(() => {
    if (authLocationState?.openAuth) setOpen(true)
  }, [authLocationState?.openAuth])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canSubmit = useMemo(() => {
    if (!email.trim() || !password.trim()) return false
    if (mode === 'register' && (!firstName.trim() || !lastName.trim())) return false
    return true
  }, [email, firstName, lastName, mode, password])

  const resetForm = () => {
    setPassword('')
    setFirstName('')
    setLastName('')
    setError(null)
    setSuccess(null)
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    resetForm()
  }

  const onClose = () => {
    setOpen(false)
    resetForm()
    setEmail('')
    navigate('/', { replace: true, state: {} })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    try {
      if (mode === 'register') {
        await registerApi({
          email,
          password,
          first_name: firstName,
          last_name: lastName,
        })
        setPassword('')
        setFirstName('')
        setLastName('')
        setSuccess('Account created! Please log in.')
        setMode('login')
      } else {
        await login(email.trim(), password)
        setOpen(false)
        resetForm()
        setEmail('')
        const next = safePostLoginPath(authLocationState?.from)
        navigate(next, { replace: true, state: {} })
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message)
      else if (err instanceof Error) setError(err.message)
      else setError('Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-hero">
      <TopNav onLoginClick={() => setOpen(true)} />

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-14">
        <motion.div
          className="text-center"
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
        >
          <motion.h1
            className="mx-auto max-w-2xl text-balance text-4xl font-semibold tracking-tight text-ink-950 sm:text-5xl"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            One <span className="text-brand-600">Build</span> for all your PC needs
          </motion.h1>
          <motion.p
            className="mx-auto mt-4 max-w-xl text-pretty text-sm leading-6 text-ink-800"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            Create and manage builds, browse parts, and get compatibility-aware help. Fast, simple, and designed to feel
            premium.
          </motion.p>

          <motion.div
            className="mt-8 flex justify-center gap-3"
            variants={fadeUp}
            transition={{ duration: 0.5 }}
          >
            {state.status === 'authenticated' ? (
              <Link to="/app">
                <Button variant="secondary">Go to dashboard</Button>
              </Link>
            ) : (
              <Button onClick={() => setOpen(true)}>Log in</Button>
            )}
            <Link to="/app/catalog">
              <Button variant="ghost" className="border border-white/70 bg-white/40 backdrop-blur hover:bg-white/60">
                Browse catalog
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.section
          className="mt-24 grid gap-4 sm:grid-cols-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.12, delayChildren: 0.35 } },
          }}
        >
          <FeatureCard
            icon={<Cpu className="h-5 w-5 text-brand-600" />}
            title="Browse"
            body="Explore a full catalog of PC parts — CPUs, GPUs, RAM, and more — all in one place."
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5 text-brand-600" />}
            title="Plan"
            body="Create builds, track compatibility, and manage your component list with ease."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5 text-brand-600" />}
            title="Ask"
            body="Chat with an AI assistant that queries parts data, understands intent, and answers build questions."
          />
        </motion.section>
      </main>

      <Modal open={open} title={mode === 'login' ? 'Account Log In' : 'Create Account'} onClose={onClose}>
        <div className="p-7">
          <button
            className="absolute right-4 top-4 rounded-lg p-2 text-ink-800/60 hover:bg-white/60 hover:text-ink-900"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>

          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-ink-950 text-sm font-semibold text-white">
                PC
              </span>
              <span className="text-sm font-semibold tracking-tight text-ink-950">PC Build Assistant</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-ink-950">
              {mode === 'login' ? 'Account Log In' : 'Create Account'}
            </h2>
          </div>

          <form className="mt-6 space-y-3" onSubmit={onSubmit} noValidate>
            {mode === 'register' ? (
              <div className="grid grid-cols-2 gap-3">
                <TextField label="First name" value={firstName} onChange={setFirstName} placeholder="First name" />
                <TextField label="Last name" value={lastName} onChange={setLastName} placeholder="Last name" />
              </div>
            ) : null}

            <TextField
              label="Username/Email"
              value={email}
              onChange={setEmail}
              placeholder="Username/Email"
              autoComplete="email"
              name="email"
            />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              name="password"
            />

            {success ? (
              <motion.div
                className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                role="status"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.25 }}
              >
                {success}
              </motion.div>
            ) : null}

            {error ? (
              <motion.div
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.25 }}
              >
                {error}
              </motion.div>
            ) : null}

            <div className="pt-2">
              <Button
                className="w-full"
                type="submit"
                disabled={!canSubmit}
                loading={busy}
                variant="primary"
              >
                {mode === 'login' ? 'Log In' : 'Register'}
              </Button>
            </div>
          </form>

          <div className="mt-4 flex items-center justify-between text-xs">
            <button className="text-brand-600 hover:underline" type="button" onClick={() => switchMode('login')}>
              Having problems?
            </button>
            <button
              className="text-brand-600 hover:underline"
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Register Now' : 'Back to Log In'}
            </button>
          </div>

        </div>
      </Modal>
    </div>
  )
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <motion.div
      className="rounded-xl2 border border-white/70 bg-white/55 p-6 shadow-soft backdrop-blur"
      variants={cardVariant}
      whileHover={{ y: -4, transition: { type: 'spring', stiffness: 400, damping: 25 } }}
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm">{icon}</div>
      <div className="text-left">
        <div className="text-sm font-semibold text-ink-950">{title}</div>
        <div className="mt-1 text-sm leading-6 text-ink-800">{body}</div>
      </div>
    </motion.div>
  )
}
