/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, Save, Key } from "lucide-react"
import useUI from "@/hooks/useUI"
import { normalizeProvider } from "@/lib/utils"
import { useSettings, useSettingsMutation, useModels } from "../../hooks/useSettings"
import { useAICredentials } from "../../hooks/useAICredentials"

/**
 * AutoTitlesSettings component for managing automatic conversation titling.
 * Refactored to use TanStack Query.
 */
export function AutoTitlesSettings() {
  const { toast } = useUI()
  
  // Queries
  const { data: settings, isLoading: loadingSettings } = useSettings();
  const { data: aicredentials = [], isLoading: loadingCreds } = useAICredentials();
  
  // Local state for form (initialized from settings in useEffect)
  const [formState, setFormState] = useState(null);

  useEffect(() => {
    if (settings && !formState) {
      setFormState(settings);
    }
  }, [settings, formState]);

  // Models Query
  const provider = formState?.llm_provider;
  const targetCredId = formState?.active_cred_id || null;
  const { 
    data: availableModels = [], 
    isLoading: fetchingModels,
    refetch: refetchModels 
  } = useModels(provider, targetCredId);

  // Mutations
  const { updateMutation, resetPromptMutation } = useSettingsMutation();

  const handleSave = () => {
    updateMutation.mutate(formState, {
      onSuccess: (updated) => {
        setFormState(updated);
        toast.success('Configuración guardada exitosamente');
      },
      onError: () => toast.error('Error al guardar la configuración')
    });
  }

  const handleResetPrompt = () => {
    resetPromptMutation.mutate(null, {
      onSuccess: (updated) => {
        setFormState(prev => ({ ...prev, titling_prompt: updated.titling_prompt }));
        toast.success('Prompt restablecido');
      },
      onError: () => toast.error('Error al restablecer el prompt')
    });
  }

  if (loadingSettings || loadingCreds || !formState) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Filter credentials that support titling and match the current provider
  const filteredCreds = aicredentials.filter(c => {
    const tasks = typeof c.tasks === 'string' ? JSON.parse(c.tasks) : c.tasks
    const mappedProvider = normalizeProvider(formState.llm_provider)
    return tasks.includes('titling') && c.provider === mappedProvider
  })

  return (
    <div className="space-y-6">
      <Card className="border-muted-foreground/10 shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Títulos Automáticos de Conversación</CardTitle>
          <CardDescription className="text-sm">
            Genera automáticamente títulos concisos para nuevas conversaciones usando IA después del primer mensaje del usuario.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3">
            <Switch 
              id="titling-toggle"
              checked={formState.is_titling_enabled}
              onCheckedChange={(checked) => setFormState({...formState, is_titling_enabled: checked})}
            />
            <label htmlFor="titling-toggle" className="text-sm font-medium cursor-pointer">Activar Titulado Automático</label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="grid gap-2">
              <label htmlFor="provider" className="text-sm font-medium">Proveedor LLM</label>
              <Select 
                value={formState.llm_provider} 
                onValueChange={(val) => {
                  setFormState({...formState, llm_provider: val, llm_model: '', active_cred_id: null})
                }}
              >
                <SelectTrigger id="provider">
                  <SelectValue placeholder="Seleccionar Proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="mistral">Mistral AI</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="llm-model-select" className="text-sm font-medium">Modelo</label>
              <Select 
                value={formState.llm_model || ''} 
                onValueChange={(val) => setFormState({...formState, llm_model: val})}
                disabled={availableModels.length === 0}
              >
                <SelectTrigger id="llm-model-select" className="w-full">
                  <SelectValue placeholder={availableModels.length > 0 ? "Seleccionar un modelo" : "Selecciona una credencial para listar modelos"} />
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
                Credencial Activa para Titulado
              </label>
              <div className="flex gap-2">
                <Select 
                  value={formState.active_cred_id?.toString() || (filteredCreds.length > 0 ? filteredCreds[0].id.toString() : "none")}
                  onValueChange={(val) => {
                    setFormState({...formState, active_cred_id: parseInt(val)})
                  }}
                  disabled={filteredCreds.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={filteredCreds.length > 0 ? `${filteredCreds[0].name} (${filteredCreds[0].provider})` : "Sin credencial para este proveedor"} />
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
                  onClick={() => refetchModels()}
                  disabled={fetchingModels || !formState.llm_provider}
                  title="Refrescar modelos"
                >
                  <RefreshCw className={`h-4 w-4 ${fetchingModels ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              {filteredCreds.length === 0 && (
                <p className="text-[10px] text-destructive font-medium italic animate-pulse mt-1">
                  ⚠️ No se encontraron llaves para {formState.llm_provider}. Añade una en la pestaña "Llaves AI" con la tarea 'titling' activada.
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Se utilizará la primera credencial activa para el proveedor seleccionado que tenga habilitada la tarea de titulado.
              </p>
            </div>

            <div className="grid gap-2 md:col-span-2">
              <div className="flex justify-between items-center">
                <label htmlFor="prompt" className="text-sm font-medium">Prompt de Titulado</label>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  type="button"
                  onClick={handleResetPrompt}
                  className="h-7 text-xs"
                >
                  Restablecer Predeterminado
                </Button>
              </div>
              <textarea 
                id="prompt"
                placeholder="Instrucciones para el prompt de titulado..."
                value={formState.titling_prompt || ''}
                onChange={(e) => setFormState({...formState, titling_prompt: e.target.value})}
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono 3xl:text-xs"
              />
              <p className="text-xs text-muted-foreground italic">
                El sistema añade automáticamente un fragmento de la primera respuesta significativa a este prompt.
              </p>

            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-muted-foreground/10">
            <Button onClick={handleSave} disabled={updateMutation.isPending} className="gap-2">
              {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar Configuración
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
