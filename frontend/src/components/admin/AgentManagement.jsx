/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect } from "react"
import { Search, Plus, MoreHorizontal, Bot, Settings2, Trash2, Loader2, BrainCircuit } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Info } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AgentForm } from "./AgentForm"
import { getTagColor, cn } from "@/lib/utils"
import useUI from "../../hooks/useUI"

/**
 * AgentManagement component for configuring and managing AI assistants.
 * @returns {JSX.Element}
 */
export function AgentManagement() {
  const ui = useUI()
  const [agents, setAgents] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch("/api/v1/agents", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        // Force data to be an array
        setAgents(Array.isArray(data) ? data : [])
      } else {
        setAgents([])
      }
    } catch (error) {
      console.error("Error fetching agents:", error)
      setAgents([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAgent = async (agent) => {
    if (!agent) return

    ui.confirm(
      "Delete Agent",
      `Are you sure you want to delete ${agent.name}?`,
      async () => {
        try {
          const token = localStorage.getItem("access_token")
          const response = await fetch(`/api/v1/agents/${agent.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (response.ok) {
            ui.toast.success(`Agent ${agent.name} deleted successfully`)
            fetchAgents()
          } else {
            const data = await response.json()
            ui.toast.error(data.detail || "Error deleting agent")
          }
        } catch (error) {
          console.error("Error deleting agent:", error)
          ui.toast.error("Connection error")
        }
      }
    )
  }

  const handleEditAgent = (agent) => {
    setEditingAgent(agent)
    setIsFormOpen(true)
  }

  const handleAddAgent = () => {
    setEditingAgent(null)
    setIsFormOpen(true)
  }

  // Double check agents is an array before filtering
  const safeAgents = Array.isArray(agents) ? agents : [];
  const filteredAgents = safeAgents.filter((agent) =>
    (agent?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full space-y-4 min-h-0">
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button className="gap-2" onClick={handleAddAgent}>
          <Plus className="h-4 w-4" />
          Add Agent
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 rounded-xl border bg-card/30 backdrop-blur-sm shadow-soft">
        <Table>
          <TableHeader className="bg-secondary sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 pl-6">Agent</TableHead>
              <TableHead className="text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-6">Type</TableHead>
              <TableHead className="text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-6">Status</TableHead>
              <TableHead className="text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-6">Tags</TableHead>
              <TableHead className="text-right text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center px-6">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground/50">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading agents...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredAgents.length === 0 ? (

              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center px-6">
                  <div className="flex justify-center">
                    <Alert className="max-w-xs border-dashed bg-muted/20">
                      <Info className="h-4 w-4" />
                      <AlertDescription>No agents found matching your search.</AlertDescription>
                    </Alert>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredAgents.map((agent) => (
                <TableRow key={agent?.id || Math.random()}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 flex items-center justify-center bg-primary/10 rounded-md text-primary shrink-0 text-lg">
                        {agent?.icon || <Bot className="h-4 w-4" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-medium truncate">{agent?.name || "Unnamed"}</span>
                          {agent?.memory_enabled && (
                            <BrainCircuit title="Memory Enabled" className="h-3.5 w-3.5 text-primary shrink-0 cursor-help" aria-label="Memory Enabled" />
                          )}
                        </div>
                        <span className="text-[10px] 3xl:text-xs text-muted-foreground truncate max-w-[200px]">
                          {agent?.url || "No URL"}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-6">
                    <span className="text-xs capitalize">{agent?.type || "unknown"}</span>
                  </TableCell>
                  <TableCell className="px-6">
                    <Badge variant={agent?.is_active ? "default" : "secondary"} className="text-[10px] 3xl:text-xs px-1.5 py-0">
                      {agent?.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(agent?.agent_tags) && agent.agent_tags.length > 0 ? (
                        agent.agent_tags.map((at) => {
                          if (!at?.tag?.name) return null;
                          const colors = getTagColor(at.tag.name);
                          return (
                            <Badge 
                              key={at.tag.id} 
                              variant="outline" 
                              className={cn("text-[10px] 3xl:text-xs px-1.5 py-0 whitespace-nowrap border", colors.bg, colors.text, colors.border)}
                            >
                              {at.tag.name}
                            </Badge>
                          );
                        })
                      ) : Array.isArray(agent?.tags) && agent.tags.length > 0 ? (
                         agent.tags.map((tag) => {
                          const tagName = typeof tag === 'string' ? tag : tag?.name;
                          if (!tagName) return null;
                          const colors = getTagColor(tagName);
                          return (
                            <Badge 
                              key={tag?.id || tagName} 
                              variant="outline" 
                              className={cn("text-[10px] 3xl:text-xs px-1.5 py-0 whitespace-nowrap border", colors.bg, colors.text, colors.border)}
                            >
                              {tagName}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-[10px] 3xl:text-xs text-muted-foreground italic">No tags</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleEditAgent(agent)}>
                          <Settings2 className="h-4 w-4" /> Edit Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDeleteAgent(agent)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete Agent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>

      <AgentForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        agent={editingAgent} 
        onSuccess={fetchAgents} 
      />
    </div>
  )
}
