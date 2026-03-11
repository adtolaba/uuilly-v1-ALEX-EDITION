/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Save, Key, Plus } from "lucide-react"
import useUI from "@/hooks/useUI"
import { normalizeProvider } from "@/lib/utils"

/**
 * AutoTitlesSettings component for managing automatic conversation titling.
 * Refactored to use centralized AI Credentials.
 */
export function AutoTitlesSettings() {
  const { toast } = useUI()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fetchingModels, setFetchingModels] = useState(false)
  const [availableModels, setAvailableModels] = useState([])
  const [aicredentials, setAiCredentials] = useState([])
  
  const [settings, setSettings] = useState({
    is_titling_enabled: false,
    llm_provider: 'openai',
    llm_model: '',
    llm_api_key: '', // Legacy API Key (masked)
    titling_prompt: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      
      const [settingsRes, credsRes] = await Promise.all([
        fetch('/api/v1/settings', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/ai-credentials', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      let settingsData = null
      let credsData = []

      if (settingsRes.ok) {
        settingsData = await settingsRes.json()
        setSettings(settingsData)
      }

      if (credsRes.ok) {
        credsData = await credsRes.json()
        setAiCredentials(credsData)
      }

      // Logic for initial model fetching
      if (settingsData && credsData.length > 0) {
        const provider = settingsData.llm_provider
        const filtered = credsData.filter(c => {
          const tasks = typeof c.tasks === 'string' ? JSON.parse(c.tasks) : c.tasks
          const mappedProvider = normalizeProvider(provider)
          return tasks.includes('titling') && c.provider === mappedProvider
        })
        
        // Prioritize explicit active_cred_id, fallback to first matching cred
        const targetCredId = settingsData.active_cred_id || (filtered.length > 0 ? filtered[0].id : null);
        
        if (targetCredId) {
          fetchModels(provider, targetCredId)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const fetchModels = async (provider, credId = null) => {
    if (!provider) {
      setAvailableModels([])
      return
    }
    try {
      setFetchingModels(true)
      const token = localStorage.getItem('access_token')
      let url = `/api/v1/settings/models?provider=${provider}`
      if (credId) url += `&credential_id=${credId}`
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const models = await response.json()
        setAvailableModels(Array.isArray(models) ? models : [])
      } else {
        setAvailableModels([])
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      setAvailableModels([])
    } finally {
      setFetchingModels(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      if (response.ok) {
        toast.success('Settings updated successfully')
        const updated = await response.json()
        setSettings(updated)
      } else {
        toast.error('Failed to update settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const handleResetPrompt = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/v1/settings/reset-prompt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const updated = await response.json()
        setSettings(prev => ({ ...prev, titling_prompt: updated.titling_prompt }))
        toast.success('Prompt reset to default')
      }
    } catch (error) {
      toast.error('Failed to reset prompt')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Filter credentials that support titling and match the current provider
  const filteredCreds = aicredentials.filter(c => {
    const tasks = typeof c.tasks === 'string' ? JSON.parse(c.tasks) : c.tasks
    const mappedProvider = normalizeProvider(settings.llm_provider)
    return tasks.includes('titling') && c.provider === mappedProvider
  })

  return (
    <div className="space-y-6">
      <Card className="border-muted-foreground/10 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Auto Conversation Titles</CardTitle>
          <CardDescription className="text-sm">
            Automatically generate concise titles for new conversations using AI after the first user message.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Switch 
              id="titling-toggle"
              checked={settings.is_titling_enabled}
              onCheckedChange={(checked) => setSettings({...settings, is_titling_enabled: checked})}
            />
            <label htmlFor="titling-toggle" className="text-sm font-medium cursor-pointer">Enable Automatic Titling</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="grid gap-2">
              <label htmlFor="provider" className="text-sm font-medium">LLM Provider</label>
              <Select 
                value={settings.llm_provider} 
                onValueChange={(val) => {
                  setSettings({...settings, llm_provider: val, llm_model: '', active_cred_id: null})
                  setAvailableModels([]) // Clear previous models
                  fetchModels(val)
                }}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Select Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="mistral">Mistral AI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="llm-model-select" className="text-sm font-medium">Model</label>
              <Select 
                value={settings.llm_model || ''} 
                onValueChange={(val) => setSettings({...settings, llm_model: val})}
                disabled={availableModels.length === 0}
              >
                <SelectTrigger id="llm-model-select" className="w-full">
                  <SelectValue placeholder={availableModels.length > 0 ? "Select a model" : "Select a key to list models"} />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(model => (
                    <SelectItem key={model} value={model}>{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4" />
                Active Credential for Titling
              </label>
              <div className="flex gap-2">
                <Select 
                  value={filteredCreds.length > 0 ? (settings.active_cred_id || filteredCreds[0].id).toString() : "none"}
                  onValueChange={(val) => {
                    setSettings({...settings, active_cred_id: parseInt(val)})
                    fetchModels(settings.llm_provider, val)
                  }}
                  disabled={filteredCreds.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={filteredCreds.length > 0 ? `${filteredCreds[0].name} (${filteredCreds[0].provider})` : "No credential for this provider"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCreds.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon" 
                  type="button"
                  onClick={() => {
                    const currentId = settings.active_cred_id || (filteredCreds.length > 0 ? filteredCreds[0].id : null);
                    fetchModels(settings.llm_provider, currentId)
                  }}
                  disabled={fetchingModels || !settings.llm_provider}
                  title="Refresh models"
                >
                  <RefreshCw className={`h-4 w-4 ${fetchingModels ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {filteredCreds.length === 0 && (
                <p className="text-[10px] text-destructive font-medium italic animate-pulse mt-1">
                  ⚠️ No keys found for {settings.llm_provider}. Add one in "AI Keys" tab with 'titling' task enabled.
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                The first active credential for the selected provider with 'titling' task enabled will be used.
              </p>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <div className="flex justify-between items-center">
                <label htmlFor="prompt" className="text-sm font-medium">Titling Prompt</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  type="button"
                  onClick={handleResetPrompt}
                  className="h-7 text-xs"
                >
                  Reset to Default
                </Button>
              </div>
              <textarea 
                id="prompt"
                placeholder="Titling prompt instructions..."
                value={settings.titling_prompt || ''}
                onChange={(e) => setSettings({...settings, titling_prompt: e.target.value})}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono 3xl:text-xs"
              />
              <p className="text-xs text-muted-foreground italic">
                The system automatically appends a fragment of the first significant response to this prompt.
              </p>

            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-muted-foreground/10">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
