/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect } from "react"
import { Search, Tag, Trash2, Plus, Loader2 } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { getTagColor, cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import useUI from "../../hooks/useUI"

/**
 * TagManagement component for viewing and managing global system tags.
 * @returns {JSX.Element}
 */
export function TagManagement() {
  const ui = useUI()
  const [tags, setTags] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [newTagName, setNewTagName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch("/api/v1/tags", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setTags(data)
      }
    } catch (error) {
      console.error("Error fetching tags:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateTag = async (e) => {
    e.preventDefault()
    if (!newTagName.trim()) return

    setIsCreating(true)
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch("/api/v1/tags", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newTagName.trim().toLowerCase() }),
      })

      if (response.ok) {
        ui.toast.success(`Tag "${newTagName}" created successfully`)
        setNewTagName("")
        fetchTags()
      } else {
        const data = await response.json()
        ui.toast.error(data.detail || "Error creating tag")
      }
    } catch (error) {
      console.error("Error creating tag:", error)
      ui.toast.error("Connection error")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteTag = async (tag) => {
    ui.confirm(
      "Delete Tag",
      `Are you sure you want to delete the tag "${tag.name}"? This might affect users and agents associated with it.`,
      async () => {
        try {
          const token = localStorage.getItem("access_token")
          const response = await fetch(`/api/v1/tags/${tag.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (response.ok) {
            ui.toast.success(`Tag "${tag.name}" deleted successfully`)
            fetchTags()
          } else {
            const data = await response.json()
            ui.toast.error(data.detail || "Error deleting tag")
          }
        } catch (error) {
          console.error("Error deleting tag:", error)
          ui.toast.error("Connection error")
        }
      }
    )
  }

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full space-y-4 min-h-0">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tags..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <form onSubmit={handleCreateTag} className="flex items-center gap-2 w-full sm:w-auto">
          <Input
            placeholder="New tag name..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            className="h-9"
            autoComplete="off"
          />
          <Button type="submit" size="sm" disabled={isCreating || !newTagName.trim()} className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Add Tag
          </Button>
        </form>
      </div>

      <ScrollArea className="flex-1 min-h-0 rounded-xl border bg-card/30 backdrop-blur-sm shadow-soft">
        <Table>
          <TableHeader className="bg-secondary sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-[300px] text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 pl-6">Tag Name</TableHead>
              <TableHead className="text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-6">Type</TableHead>
              <TableHead className="text-right text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center px-6">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground/50">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading tags...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredTags.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center px-6">
                  No tags found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="font-medium pl-6">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      {(() => {
                        const colors = getTagColor(tag.name);
                        return (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] 3xl:text-xs px-1.5 py-0 border", colors.bg, colors.text, colors.border)}
                          >
                            {tag.name}
                          </Badge>
                        );
                      })()}
                    </div>
                  </TableCell>
                  <TableCell className="px-6">
                    <span className="text-xs text-muted-foreground capitalize">Global</span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteTag(tag)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}
