import { useState } from 'react'

export interface CepData {
  logradouro: string
  bairro: string
  localidade: string
  uf: string
}

export function useCepLookup() {
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  async function lookup(digits: string): Promise<CepData | null> {
    if (digits.length !== 8) return null
    setLoading(true)
    setNotFound(false)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await res.json()
      if (data.erro) {
        setNotFound(true)
        return null
      }
      return {
        logradouro: data.logradouro ?? '',
        bairro: data.bairro ?? '',
        localidade: data.localidade ?? '',
        uf: data.uf ?? '',
      }
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }

  return { lookup, loading, notFound }
}
