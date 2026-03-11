/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Trash2, Search, BrainCircuit, User, Bot, Clock, Plus, X, Settings2, Save, Pencil, UploadCloud, FileText } from "lucide-react"
import useUI from "@/hooks/useUI"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn, normalizeProvider } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AdvancedSearchModal } from "./AdvancedSearchModal"

/**
 * MemoryManagement component for viewing, filtering and creating atomic facts.
 */
export function MemoryManagement({ currentUser }) {
  const { toast, confirm } = useUI()
  const isAdmin = currentUser?.role === 'ADMIN'
  const [loading, setLoading] = useState(true)
  const [memories, setMemories] = useState([])
  const [agents, setAgents] = useState([])
  
  // Settings state
  const [settings, setSettings] = useState(null)
  const [availableModels, setAvailableModels] = useState([])
  const [savingSettings, setSavingSettings] = useState(false)

  const [searchTerm, setSearchSearchTerm] = useState("")
  const [selectedAgentId, setSelectedAgentId] = useState("all")
  const [selectedUserId, setSelectedUserId] = useState("all")
  const [memoryType, setMemoryType] = useState("all")

  const [accordionValue, setAccordionValue] = useState("")
  const [selectedIds, setSelectedIds] = useState([]) // Track selected facts
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  
  const [isAdding, setIsAdding] = useState(false)
  const [editingFact, setEditingFact] = useState(null) // Fact being edited
  const [saving, setSaving] = useState(false)
  
  // Bulk upload state
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [isBulkUploading, setIsBulkUploading] = useState(false)
  const [bulkFile, setBulkFile] = useState(null)
  const [bulkAgentId, setBulkAgentId] = useState("")
  
  const [newFact, setNewFact] = useState({
    fact: "",
    agent_id: "",
    user_id: null 
  })

  const fetchModels = useCallback(async (provider, credId = null) => {
    if (!provider) return
    try {
      const token = localStorage.getItem('access_token')
      let url = `/api/v1/settings/models?provider=${provider}`
      if (credId) url += `&credential_id=${credId}`
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      if (response.ok) {
        const models = await response.json()
        setAvailableModels(Array.isArray(models) ? models : [])
      }
    } catch {
      console.error('Error fetching models')
    }
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setSelectedIds([]) // Reset selection
      const token = localStorage.getItem('access_token')
      
      // Build query params
      const params = new URLSearchParams()
      if (selectedAgentId !== 'all') params.append('agent_id', selectedAgentId)
      if (selectedUserId !== 'all') params.append('user_id', selectedUserId)
      if (memoryType !== 'all') params.append('memory_type', memoryType)

      const url = `/api/v1/memories?${params.toString()}`

      // Basic fetches allowed for both
      const [memRes, agentsRes] = await Promise.all([
        fetch(url, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/v1/agents', { headers: { 'Authorization': `Bearer ${token}` } })
      ])

      if (memRes.ok) setMemories(await memRes.json())
      if (agentsRes.ok) setAgents(await agentsRes.json())
      
      // Admin only fetches
      if (isAdmin) {
        const [settingsRes, credsRes] = await Promise.all([
          fetch('/api/v1/settings', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('/api/v1/ai-credentials', { headers: { 'Authorization': `Bearer ${token}` } })
        ])

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          setSettings(settingsData)
          
          let credsData = []
          if (credsRes.ok) {
            credsData = await credsRes.json()
          }
          
          // Auto fetch models if possible
          const provider = settingsData.llm_provider
          const filtered = credsData.filter(c => {
            const tasks = typeof c.tasks === 'string' ? JSON.parse(c.tasks) : c.tasks
            const mappedProvider = normalizeProvider(provider)
            return tasks.includes('extraction') && c.provider === mappedProvider
          })
          
          const activeCredId = settingsData.active_extraction_cred_id || (filtered.length > 0 ? filtered[0].id : null)
          if (provider && activeCredId) {
            fetchModels(provider, activeCredId)
          }
        }
      }
    } catch {
      console.error('Error fetching data')
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [selectedAgentId, selectedUserId, memoryType, isAdmin, toast, fetchModels])

  useEffect(() => {
    fetchData()

    // Listen for background refresh events (from WebSockets)
    const handleRefresh = () => {
      fetchData()
    }
    window.addEventListener('refresh-memories', handleRefresh)
    return () => window.removeEventListener('refresh-memories', handleRefresh)
  }, [fetchData])

  const handleFilterChange = (filters) => {
    setSelectedAgentId(filters.agentId)
    setSelectedUserId(filters.userId)
    setMemoryType(filters.memoryType)
  }

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true)
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
        toast.success('Extraction settings saved')
        setAccordionValue("") // Close accordion
      }
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const handleResetPrompt = async () => {
    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/v1/settings/reset-memory-prompt', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const updated = await response.json()
        setSettings(prev => ({ ...prev, memory_extraction_prompt: updated.memory_extraction_prompt }))
        toast.success('Prompt reset to default')
      }
    } catch {
      toast.error('Failed to reset prompt')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    const confirmed = await confirm({
      title: "Bulk Delete Memories",
      description: `You are about to delete ${selectedIds.length} memories. This action cannot be undone.`,
      confirmLabel: "Delete All",
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      setIsBulkDeleting(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/v1/memories/bulk-delete', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids: selectedIds })
      })

      if (response.ok) {
        toast.success(`${selectedIds.length} memories deleted`)
        setSelectedIds([])
        fetchData()
      }
    } catch {
      toast.error('Error in bulk delete')
    } finally {
      setIsBulkDeleting(false)
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredMemories.map(m => m.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleCreate = async () => {
    if (!newFact.fact || !newFact.agent_id) {
      toast.error('Fact and Agent are required')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch('/api/v1/memories', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...newFact,
          agent_id: parseInt(newFact.agent_id)
        })
      })

      if (response.ok) {
        toast.success('Fact added successfully')
        setIsAdding(false)
        setNewFact({ fact: "", agent_id: "", user_id: null })
        fetchData()
      } else {
        toast.error('Failed to add fact')
      }
    } catch {
      toast.error('Error adding fact')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingFact || !editingFact.fact) {
      toast.error('Fact content is required')
      return
    }

    try {
      setSaving(true)
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/v1/memories/${editingFact.id}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fact: editingFact.fact
        })
      })

      if (response.ok) {
        toast.success('Memory updated successfully')
        setEditingFact(null)
        fetchData()
      } else {
        toast.error('Failed to update memory')
      }
    } catch {
      toast.error('Error updating memory')
    } finally {
      setSaving(false)
    }
  }

  const handleBulkUpload = async () => {
    if (!bulkFile || !bulkAgentId) {
      toast.error('File and Agent are required')
      return
    }

    try {
      setIsBulkUploading(true)
      const token = localStorage.getItem('access_token')
      
      const formData = new FormData()
      formData.append('file', bulkFile)
      formData.append('agent_id', bulkAgentId)
      formData.append('provider', settings?.llm_provider || 'openai')
      if (settings?.memory_extraction_model) {
        formData.append('model', settings.memory_extraction_model)
      }

      const response = await fetch('/api/v1/memories/bulk-upload', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        toast.success('Bulk upload started', {
          description: "Alex está atomizando el conocimiento en segundo plano."
        })
        setShowBulkModal(false)
        setBulkFile(null)
        setBulkAgentId("")
      } else {
        const errorData = await response.json()
        toast.error(errorData.detail || 'Bulk upload failed')
      }
    } catch {
      toast.error('Error starting bulk upload')
    } finally {
      setIsBulkUploading(false)
    }
  }

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: "Delete Memory",
      description: "This fact will be permanently removed and agents will no longer remember it.",
      confirmLabel: "Delete",
      variant: "destructive"
    })

    if (!confirmed) return

    try {
      const token = localStorage.getItem('access_token')
      const response = await fetch(`/api/v1/memories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        toast.success('Memory deleted')
        fetchData()
      }
    } catch {
      toast.error('Error deleting memory')
    }
  }

  const filteredMemories = memories.filter(m => {
    const matchesSearch = m.fact.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         m.agent?.name.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const hasActiveFilters = selectedAgentId !== "all" || selectedUserId !== "all" || memoryType !== "all"
  
  if (loading && memories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 h-full flex flex-col pt-2 max-w-[1600px] mx-auto w-full min-h-0">
      {/* Configuration Accordion - Only for Admin */}
      {isAdmin && (
        <Accordion 
          type="single" 
          collapsible 
          className="w-full border rounded-xl bg-muted/20 px-4 shrink-0 shadow-soft"
          value={accordionValue}
          onValueChange={setAccordionValue}
        >
          <AccordionItem value="settings" className="border-b-0">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Settings2 className="h-4 w-4 text-primary" />
                Memory Extraction Configuration
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/70">Extraction Provider</label>
                  <Select 
                    value={settings?.llm_provider || 'openai'} 
                    onValueChange={(val) => {
                      setSettings({...settings, llm_provider: val, memory_extraction_model: '', active_extraction_cred_id: null})
                      setAvailableModels([])
                      fetchModels(val)
                    }}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background rounded-lg border-muted-foreground/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="google">Google Gemini</SelectItem>
                      <SelectItem value="mistral">Mistral AI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground/70">Extraction Model</label>
                  <Select 
                    value={settings?.memory_extraction_model || ''} 
                    onValueChange={(val) => setSettings({...settings, memory_extraction_model: val})}
                    disabled={availableModels.length === 0}
                  >
                    <SelectTrigger className="h-9 text-xs bg-background rounded-lg border-muted-foreground/10">
                      <SelectValue placeholder="Select model..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-muted-foreground/70">Extraction Prompt</label>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={handleResetPrompt}>Reset to Default</Button>
                  </div>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-xl border border-muted-foreground/10 bg-background/50 px-4 py-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all resize-none 3xl:text-xs"
                    value={settings?.memory_extraction_prompt || ''}

                    onChange={(e) => setSettings({...settings, memory_extraction_prompt: e.target.value})}
                    placeholder="System prompt for memory extraction..."
                  />
                  <p className="text-[10px] text-muted-foreground italic opacity-70">Uses {`{message}`} as placeholder for conversation content.</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button size="sm" className="h-10 px-6 gap-2 rounded-xl shadow-soft" onClick={handleSaveSettings} disabled={savingSettings}>
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Configuration
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Header / Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between shrink-0 px-1">
        <div className="flex flex-1 gap-3 w-full">
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-4 bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-2 animate-in fade-in slide-in-from-left-2 duration-200 shadow-soft">
              <span className="text-sm font-bold text-destructive">{selectedIds.length} selected</span>
              <div className="h-4 w-[1px] bg-destructive/20" />
              <Button 
                variant="destructive" 
                size="sm" 
                className="h-9 px-4 text-xs font-bold uppercase tracking-wider shadow-md" 
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> : <Trash2 className="h-3.5 w-3.5 mr-2" />}
                Delete Selected
              </Button>
              <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => setSelectedIds([])}>Cancel</Button>
            </div>
          ) : (
            <>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search facts..."
                  className="pl-10 h-10 text-sm bg-background/50 border-muted-foreground/10 focus:border-primary/30 transition-all rounded-xl shadow-soft"
                  value={searchTerm}
                  onChange={(e) => setSearchSearchTerm(e.target.value)}
                />
              </div>
              
              <AdvancedSearchModal 
                agents={agents} 
                onFilterChange={handleFilterChange}
                currentFilters={{
                  agentId: selectedAgentId,
                  userId: selectedUserId,
                  memoryType: memoryType
                }}
              />
            </>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 px-4 gap-2 rounded-xl shadow-soft" onClick={() => setShowBulkModal(true)}>
            <UploadCloud className="h-4 w-4 text-primary" />
            <span className="hidden lg:inline">Bulk Upload</span>
            <span className="lg:hidden">Bulk</span>
          </Button>
          <Button size="sm" className="h-10 px-5 gap-2 rounded-xl shadow-md" onClick={() => {
            setIsAdding(!isAdding)
            setEditingFact(null)
          }}>
            <Plus className="h-4 w-4" />
            Add Fact
          </Button>
        </div>
      </div>

      {/* Manual Creation/Edit Forms */}
      {(isAdding || editingFact) && (
        <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4 shadow-soft">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold flex items-center gap-2">
              {isAdding ? <Plus className="h-4 w-4 text-primary" /> : <Pencil className="h-4 w-4 text-primary" />}
              {isAdding ? "Add New Atomic Fact" : "Edit Atomic Fact"}
            </h4>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setIsAdding(false); setEditingFact(null); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">AI Agent</label>
              {isAdding ? (
                <Select value={newFact.agent_id} onValueChange={(val) => setNewFact({...newFact, agent_id: val})}>
                  <SelectTrigger className="h-10 text-xs bg-background border-muted-foreground/10 rounded-lg">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 px-3 flex items-center bg-muted/50 rounded-lg border border-transparent text-xs text-muted-foreground">
                  {editingFact.agent?.name || "N/A"}
                </div>
              )}
            </div>
            
            <div className="md:col-span-3 space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">Atomic Fact Description</label>
              <Input 
                placeholder="¿Qué aprendió Alex?" 
                value={isAdding ? newFact.fact : editingFact.fact}
                onChange={(e) => isAdding ? setNewFact({...newFact, fact: e.target.value}) : setEditingFact({...editingFact, fact: e.target.value})}
                className="h-10 text-sm bg-background border-muted-foreground/10 rounded-lg"
                autoFocus
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2 border-t border-muted-foreground/5">
            <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingFact(null); }}>Cancel</Button>
            <Button size="sm" className="px-6 rounded-lg" onClick={isAdding ? handleCreate : handleUpdate} disabled={saving || (isAdding ? (!newFact.fact || !newFact.agent_id) : !editingFact.fact)}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isAdding ? "Save Fact" : "Update Fact"}
            </Button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="flex-1 overflow-hidden border rounded-xl border-muted-foreground/10 bg-card/30 backdrop-blur-sm shadow-soft flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <table className="w-full text-sm text-left border-collapse table-fixed">
            <thead className="bg-secondary sticky top-0 z-10 border-b border-muted-foreground/10 text-muted-foreground text-[10px] 3xl:text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-4 w-[50px] text-center">
                  <Checkbox
                    checked={filteredMemories.length > 0 && selectedIds.length === filteredMemories.length}
                    onCheckedChange={handleSelectAll}
                    className="translate-y-[2px]"
                  />
                </th>
                <th className="px-4 py-4 font-bold text-muted-foreground/70">Atomic Fact</th>
                <th className="px-4 py-4 w-[200px] font-bold text-muted-foreground/70">Context / Agent</th>
                <th className="px-4 py-4 w-[120px] font-bold text-muted-foreground/70">Learned</th>
                <th className="px-4 py-4 w-[100px] font-bold text-muted-foreground/70 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted-foreground/10">
              {filteredMemories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-20 text-center text-muted-foreground italic text-sm">
                    <div className="flex flex-col items-center gap-3 opacity-40">
                      <Search className="h-10 w-10 mb-2" />
                      {searchTerm || hasActiveFilters ? "No se encontraron recuerdos con los filtros actuales." : "Alex aún no ha aprendido ningún hecho."}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMemories.map(m => (
                  <tr key={m.id} className={cn(
                    "hover:bg-muted/20 transition-all group border-b border-muted-foreground/5 last:border-0",
                    selectedIds.includes(m.id) && "bg-primary/5 shadow-inner"
                  )}>
                    <td className="px-4 py-5 text-center">
                      <Checkbox
                        checked={selectedIds.includes(m.id)}
                        onCheckedChange={() => toggleSelect(m.id)}
                        className="translate-y-[2px]"
                      />
                    </td>
                    <td className="px-4 py-5 align-top">
                      <div className="flex gap-3">
                        <div className="p-2 rounded-lg bg-primary/5 text-primary shrink-0 h-fit mt-0.5 group-hover:bg-primary/10 transition-colors">
                          <BrainCircuit className="h-4 w-4" />
                        </div>
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <span className="leading-relaxed text-[13px] 3xl:text-sm font-medium text-foreground/90 block whitespace-normal break-words">
                            {m.fact}
                          </span>
                          <span className="text-[10px] text-muted-foreground/50 font-mono">ID: {m.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 align-top">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-foreground/80 truncate">
                          <Bot className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                          <span className="truncate">{m.agent?.name || 'Deleted Agent'}</span>
                        </div>
                        <div>
                          {m.user_id ? (
                            <div className="flex items-center gap-1.5 text-[10px] text-blue-600 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-200/30 w-fit max-w-full">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{m.user?.email || `User ${m.user_id}`}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-200/30 font-bold w-fit">
                              <Settings2 className="h-3 w-3 shrink-0" />
                              GLOBAL
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5 align-top">
                      <div className="flex flex-col gap-1 text-muted-foreground/80">
                        <div className="flex items-center gap-1.5 text-[11px] font-medium">
                          <Clock className="h-3 w-3.5 opacity-60" />
                          {new Date(m.created_at).toLocaleDateString()}
                        </div>
                        <span className="text-[9px] ml-5 opacity-50 italic">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-5 text-right align-top">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-primary/10 hover:text-primary rounded-lg"
                          onClick={() => {
                            setEditingFact({...m})
                            setIsAdding(false)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive rounded-lg"
                          onClick={() => handleDelete(m.id)}
                        >
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
      </div>

      {/* Bulk Upload Modal */}
      <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
        <DialogContent className="sm:max-w-[425px] rounded-xl border-muted-foreground/10 shadow-soft-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-primary" />
              Bulk Knowledge Sync
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sube documentos para entrenar la memoria colectiva de Alex.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">1. Selecciona el Asistente Destino</label>
              <Select value={bulkAgentId} onValueChange={setBulkAgentId}>
                <SelectTrigger className="h-10 text-xs rounded-lg border-muted-foreground/10">
                  <SelectValue placeholder="Who should learn this?" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(a => <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">2. Upload File (.txt, .md)</label>
              <div className="border-2 border-dashed border-muted-foreground/10 rounded-xl p-6 text-center hover:border-primary/30 transition-all bg-muted/5 group cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".txt,.md" 
                  className="absolute inset-0 opacity-0 cursor-pointer" 
                  id="bulk-file-input"
                  onChange={(e) => setBulkFile(e.target.files[0])}
                />
                <div className="flex flex-col items-center gap-2">
                  {bulkFile ? (
                    <div className="flex flex-col items-center gap-1 text-primary animate-in zoom-in-95 duration-200">
                      <FileText className="h-8 w-8" />
                      <span className="text-xs font-bold truncate max-w-[200px]">{bulkFile.name}</span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-8 w-8 text-muted-foreground/30 group-hover:text-primary/50 transition-colors" />
                      <span className="text-xs text-muted-foreground font-medium">Select or drop file here</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-muted/20 -mx-6 -mb-6 p-4 mt-2 rounded-b-xl border-t border-muted-foreground/5">
            <Button variant="ghost" className="rounded-lg" onClick={() => setShowBulkModal(false)} disabled={isBulkUploading}>Cancel</Button>
            <Button className="rounded-lg px-6 shadow-md" onClick={handleBulkUpload} disabled={isBulkUploading || !bulkFile || !bulkAgentId}>
              {isBulkUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BrainCircuit className="h-4 w-4 mr-2" />}
              {isBulkUploading ? "Processing..." : "Start Learning"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
