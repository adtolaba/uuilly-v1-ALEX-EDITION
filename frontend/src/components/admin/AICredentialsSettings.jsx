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
import { Loader2, RefreshCw, Save, Plus, Trash2, Key, BrainCircuit, Pencil } from "lucide-react"
import useUI from "@/hooks/useUI"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

/**
 * AICredentialsSettings component for managing centralized AI credentials.
 * Handles multiple providers and task assignments.
 */
export function AICredentialsSettings() {
  const { toast, confirm } = useUI()
  const [loading, setLoading] = useState(true)
  const [credentials, setCredentials] = useState([])
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  
  // Legacy settings state
  const [legacySettings, setLegacySettings] = useState(null)

  const [formState, setFormState] = useState({
    name: 'New Credential',
    provider: 'OPENAI',
    api_key: '',
    is_active: true,
    tasks: ['titling', 'extraction']
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      
      const [credsRes, settingsRes] = await Promise.all([
        fetch('/api/v1/ai-credentials', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/settings', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (credsRes.ok) {
        const creds = await credsRes.json()
        setCredentials(creds)
      }
      
      if (settingsRes.ok) {
        const settings = await settingsRes.json()
        setLegacySettings(settings)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formState.name || (!isEditing && !formState.api_key)) {
      toast.error('Name and API Key are required')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      
      const url = isEditing 
        ? `/api/v1/ai-credentials/${editingId}`
        : '/api/v1/ai-credentials'
      
      const method = isEditing ? 'PUT' : 'POST'
      
      // If editing and api_key is empty, don't send it to avoid overwriting with empty string
      // The backend should handle partial updates
      const payload = { ...formState }
      if (isEditing && !payload.api_key) {
        delete payload.api_key
      }

      const response = await fetch(url, {
        method: method,
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        toast.success(isEditing ? 'Credential updated' : 'Credential added')
        setIsAdding(false)
        setIsEditing(false)
        setEditingId(null)
        setFormState({ name: 'New Credential', provider: 'OPENAI', api_key: '', is_active: true, tasks: ['titling', 'extraction'] })
        fetchData()
      } else {
        toast.error('Failed to save credential')
      }
    } catch (error) {
      toast.error('Error saving credential')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (cred) => {
    setFormState({
      name: cred.name,
      provider: cred.provider,
      api_key: '', // Don't populate with masked key
      is_active: cred.is_active,
      tasks: typeof cred.tasks === 'string' ? JSON.parse(cred.tasks) : cred.tasks
    })
    setEditingId(cred.id)
    setIsEditing(true)
    setIsAdding(true)
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Delete Credential",
      description: "Are you sure you want to delete this credential? Agents using it might stop working correctly.",
      confirmLabel: "Delete",
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/v1/ai-credentials/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast.success('Credential deleted')
        fetchData()
      } else {
        toast.error('Failed to delete')
      }
    } catch (error) {
      toast.error('Error deleting credential')
    }
  }

  const toggleTask = (task) => {
    setFormState(prev => {
      const tasks = prev.tasks.includes(task)
        ? prev.tasks.filter(t => t !== task)
        : [...prev.tasks, task]
      return { ...prev, tasks }
    })
  }

  const handleUpdateLegacy = async (updated) => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updated)
      })
      if (response.ok) {
        const data = await response.json()
        setLegacySettings(data)
        toast.success('Global settings updated')
      }
    } catch (error) {
      toast.error('Failed to update global settings')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Centralized Credentials Card */}
      <Card className="border-muted-foreground/10 shadow-soft">
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Key className="h-5 w-5 text-primary" />
              Central Intelligence Credentials
            </CardTitle>
            <CardDescription className="text-sm">
              Manage API keys used for system-wide intelligence tasks like memory extraction and auto-titling.
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            className="gap-2" 
            onClick={() => {
              if (isAdding) {
                setIsAdding(false)
                setIsEditing(false)
                setEditingId(null)
                setFormState({ name: 'New Credential', provider: 'OPENAI', api_key: '', is_active: true, tasks: ['titling', 'extraction'] })
              } else {
                setIsAdding(true)
              }
            }}
          >
            {isAdding ? "Close Form" : <><Plus className="h-4 w-4" /> Add New</>}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAdding && (
            <div className="p-4 rounded-lg bg-muted/30 border border-muted-foreground/10 animate-in fade-in zoom-in-95 duration-200 space-y-4">
              <h4 className="text-sm font-semibold">{isEditing ? `Edit: ${formState.name}` : "New AI Credential"}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Credential Name</label>
                  <Input 
                    placeholder="Work OpenAI Account" 
                    value={formState.name}
                    onChange={(e) => setFormState({...formState, name: e.target.value})}
                    size="sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">Provider</label>
                  <Select 
                    value={formState.provider} 
                    onValueChange={(val) => setFormState({...formState, provider: val})}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPENAI">OpenAI</SelectItem>
                      <SelectItem value="GEMINI">Google Gemini</SelectItem>
                      <SelectItem value="MISTRAL">Mistral AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium">API Key {isEditing && "(Leave empty to keep existing)"}</label>
                  <Input 
                    type="password" 
                    placeholder={isEditing ? "••••••••••••" : "sk-..."}
                    value={formState.api_key}
                    onChange={(e) => setFormState({...formState, api_key: e.target.value})}
                    size="sm"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-medium">Enabled Tasks</label>
                  <div className="flex flex-wrap gap-4 mt-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="task-titling" checked={formState.tasks.includes('titling')} onCheckedChange={() => toggleTask('titling')} />
                      <label htmlFor="task-titling" className="text-xs cursor-pointer">Auto-Titling</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="task-extraction" checked={formState.tasks.includes('extraction')} onCheckedChange={() => toggleTask('extraction')} />
                      <label htmlFor="task-extraction" className="text-xs cursor-pointer">Memory Extraction</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => {
                  setIsAdding(false)
                  setIsEditing(false)
                  setEditingId(null)
                  setFormState({ name: 'New Credential', provider: 'OPENAI', api_key: '', is_active: true, tasks: ['titling', 'extraction'] })
                }}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? "Update Credential" : "Save Credential")}
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-md border border-muted-foreground/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-muted-foreground/10 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Provider</th>
                  <th className="px-4 py-2 font-medium">Tasks</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted-foreground/10">
                {credentials.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-muted-foreground">
                      No credentials configured yet.
                    </td>
                  </tr>
                ) : (
                  credentials.map(cred => (
                    <tr key={cred.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {cred.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {cred.provider}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(typeof cred.tasks === 'string' ? JSON.parse(cred.tasks) : cred.tasks).map(t => (
                            <Badge key={t} variant="secondary" className="text-[10px] uppercase">{t}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cred.is_active ? "success" : "outline"} className="text-[10px]">
                          {cred.is_active ? "ACTIVE" : "INACTIVE"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => handleEdit(cred)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cred.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
