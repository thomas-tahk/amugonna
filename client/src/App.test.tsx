import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App (signed out)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the auth form and no signed-in navigation', async () => {
    render(<App />)
    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.queryByText(/my pantry/i)).not.toBeInTheDocument()
  })
})
