/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Plus, Search, MessageSquare, MoreVertical, Edit2, Trash2, PanelLeftClose, PanelLeftOpen, LogOut, Settings, FileText, Download, Loader2 } from "lucide-react"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { Input } from "./ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { cn, getUserColor } from "@/lib/utils"
import useChatStore from "../store/chatStore"
import useUI from "../hooks/useUI"
import { formatToMarkdown, formatToText, triggerDownload } from "../lib/exportUtils"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"
import { AlertCircle } from "lucide-react"
import { UserDropdown } from "./UserDropdown"
import logoSvg from "../assets/branding/avatar_logo.svg"

export function Sidebar({ 
  className, 
  onSelectChat, 
  onNewChat, 
  user, 
  isSidebarOpen = true, 
  onToggleSidebar,
  isAtWelcomeScreen = false
}) { 
  const ui = useUI()
  const [searchQuery, setSearchQuery] = useState("")
  const [editingId, setEditingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [downloadingId, setDownloadingId] = useState(null)

  const { 
    conversations, 
    activeChatId, 
    loading, 
    error, 
    fetchConversations, 
    setActiveChatId,
    updateConversationTitle,
    deleteConversation,
    fetchMessages
  } = useChatStore()

  useEffect(() => {
    if (user && user.id) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  const handleUpdateConversationTitle = async (conversationId, newTitle) => {
    if (!user || !user.id) {
      ui.toast.error("User not logged in.");
      return;
    }
    await updateConversationTitle(conversationId, newTitle)
  };

  const handleDeleteConversation = async (conversationId) => {
    ui.confirm(
      "Eliminar conversación",
      "¿Estás seguro de que deseas eliminar esta conversación?",
      async () => {
        await deleteConversation(conversationId)
        if (activeChatId === conversationId) {
          onNewChat(); // If deleted chat was active, go to new chat view
        }
      }
    )
  };

  const handleDownload = async (chat, format) => {
    setDownloadingId(chat.id)
    try {
      const rawMessages = await fetchMessages(chat.id)
      
      // Map 'bot'/'user' from server to 'assistant'/'user' for export utils
      const messages = rawMessages.map(m => ({
        role: m.sender === 'bot' ? 'assistant' : 'user',
        content: m.text
      }))

      const dateStr = new Date().toISOString().split('T')[0]
      const sanitizedTitle = chat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()
      
      if (format === 'markdown') {
        const content = formatToMarkdown(chat.title, messages)
        triggerDownload(content, `${sanitizedTitle}_${dateStr}.md`, 'text/markdown')
      } else {
        const content = formatToText(messages)
        triggerDownload(content, `${sanitizedTitle}_${dateStr}.txt`, 'text/plain')
      }
      
      ui.toast.success(`Conversación descargada como ${format}`)
    } catch (err) {
      ui.toast.error("Error al descargar la conversación")
      console.error(err)
    } finally {
      setDownloadingId(null)
    }
  }


  const startEditing = (chat) => {
    setEditingId(chat.id)
    setEditingTitle(chat.title)
  }

  const saveEdit = () => {
    if (editingTitle.trim() && editingId) {
      handleUpdateConversationTitle(editingId, editingTitle);
    }
    setEditingId(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent new line in input
      saveEdit();
    }
    if (e.key === "Escape") {
      setEditingId(null);
    }
  }

  const handleChatSelect = (id) => {
    // If it's being edited, don't trigger selection
    if (editingId === id) return;
    
    setActiveChatId(id)
    onSelectChat(id)
  }

  const [expandedGroups, setExpandedGroups] = useState([])

  const filteredConversations = Object.values(conversations).flat().filter(conv =>
    conv && conv.title && conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = filteredConversations.reduce((acc, conv) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const convDate = new Date(conv.created_at);
    let group = "Anteriores";
    if (convDate >= today) {
      group = "Hoy";
    } else if (convDate >= yesterday) {
      group = "Ayer";
    } else if (convDate >= sevenDaysAgo) {
      group = "Últimos 7 días";
    }
    if (!acc[group]) acc[group] = [];
    acc[group].push(conv);
    return acc;
  }, {});
  
  const allGroups = Object.keys(grouped)

  // Sync expandedGroups with allGroups whenever a new group appears
  useEffect(() => {
    if (allGroups.length > 0) {
      setExpandedGroups(prev => {
        // Find groups in allGroups that aren't in prev
        const newGroups = allGroups.filter(g => !prev.includes(g));
        if (newGroups.length > 0) {
          return [...prev, ...newGroups];
        }
        return prev;
      });
    }
  }, [allGroups.length]); // Only trigger when the number of groups changes

  if (!isSidebarOpen) {
    return (
      <nav className={cn("hidden md:flex flex-col h-full bg-background border-r w-16 py-4 transition-all duration-300 items-center gap-4", className)} aria-label="Collapsed Sidebar">
        <Button 
          variant="ghost" 
          size="icon" 
          className="hover:bg-accent text-muted-foreground"
          onClick={onToggleSidebar}
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-9 w-9"
          onClick={onNewChat}
          disabled={isAtWelcomeScreen}
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </nav>
    )
  }

  return (
    <nav className={cn("flex flex-col h-full bg-background border-r transition-all duration-300", className)} aria-label="Chat History Sidebar">
      {/* Header / New Chat */}
      <div className="py-4 3xl:py-5 pl-4 pr-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoSvg} alt="Alex" className="h-9 3xl:h-11 w-auto" />
            <div className="flex flex-col -space-y-1">
              <h1 className="text-xl 3xl:text-2xl font-bold text-foreground transition-all leading-none">Alex</h1>
              <span className="text-[11px] 3xl:text-[12px] font-normal text-primary tracking-tight">powered by di Paola</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 3xl:h-9 3xl:w-9 text-muted-foreground hover:text-foreground hidden md:flex"
            onClick={onToggleSidebar}
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4 3xl:h-5 3xl:w-5" />
          </Button>
        </div>
        <Button 
          className="w-full justify-start gap-2 h-9 3xl:h-11 text-sm 3xl:text-base transition-all shadow-md" 
          variant="default" 
          onClick={onNewChat}
          disabled={isAtWelcomeScreen}
          aria-label="Start a new chat conversation"
        >
          <Plus className="h-4 w-4 3xl:h-5 3xl:w-5" aria-hidden="true" />
          Nuevo Chat
        </Button>
      </div>

      <Separator />

      {/* Search Bar */}
      <div className="px-4 pt-4 pb-2 3xl:pt-5 3xl:pb-3">
        <div className="relative">
          {/* Dummy inputs to capture browser autofill */}
          <input type="text" name="prevent_autofill_email" className="hidden" aria-hidden="true" tabIndex="-1" />
          <input type="password" name="prevent_autofill_pass" className="hidden" aria-hidden="true" tabIndex="-1" />
          
          <Search className="absolute left-2.5 top-2.5 3xl:top-3 h-3.5 w-3.5 3xl:h-4 3xl:w-4 text-muted-foreground" aria-hidden="true" />
          <Input 
            name="chat_history_search_query"
            placeholder="Buscar chats..."
            className="pl-9 3xl:pl-10 h-8 3xl:h-10 text-[13px] 3xl:text-sm border-none bg-muted/40 focus-visible:ring-1 focus-visible:ring-primary/20 transition-all w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            aria-label="Search through your chat history"          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2 pr-4 pl-2 3xl:py-3" role="list" aria-label="Chat groups">
          {loading ? (
            <div className="flex items-center justify-center py-10" aria-busy="true" aria-label="Loading conversations">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : error ? (
            <div className="px-2 py-2" role="alert">
              <Alert variant="destructive" className="py-2 px-3">
                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
                <AlertTitle className="text-[10px] 3xl:text-xs font-bold">Error</AlertTitle>
                <AlertDescription className="text-[10px] 3xl:text-xs leading-tight">
                  {error}
                </AlertDescription>
              </Alert>
            </div>
          ) : Object.keys(grouped).length === 0 ? (
            <div className="px-2 py-4 text-center">
              <p className="text-[11px] 3xl:text-sm text-muted-foreground italic">No se encontraron conversaciones.</p>
            </div>
          ) : (
            <Accordion 
              type="multiple" 
              value={expandedGroups} 
              onValueChange={setExpandedGroups}
              className="w-full"
            >
              {Object.entries(grouped).map(([group, chats]) => (
                <AccordionItem key={group} value={group} className="border-none" role="listitem">
                  <AccordionTrigger className="hover:no-underline px-2 py-2 text-[9px] 3xl:text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground/40 transition-colors hover:text-muted-foreground/60 [&[data-state=open]>svg]:rotate-90">
                    {group}
                  </AccordionTrigger>
                  <AccordionContent className="pb-2">
                    <div className="space-y-0.5 3xl:space-y-0.5" role="list" aria-label={`Chats from ${group}`}>
                      {chats.map(chat => (
                        <div key={chat.id} className="group relative flex items-center w-full min-w-0" role="listitem">
                          <Button
                            variant={activeChatId === chat.id ? "secondary" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-2.5 3xl:gap-3 px-2.5 3xl:px-3 py-1.5 3xl:py-2 h-auto font-normal pr-10 3xl:pr-10 overflow-hidden text-[13px] 3xl:text-sm transition-all duration-200 !whitespace-nowrap min-w-0 flex",
                              activeChatId === chat.id 
                                ? "bg-secondary shadow-soft border-transparent" 
                                : "hover:bg-accent/50",
                              editingId === chat.id && "bg-accent/80"
                            )}
                            onDoubleClick={() => startEditing(chat)}
                            onClick={() => handleChatSelect(chat.id)}
                            aria-label={`Select chat: ${chat.title}`}
                            aria-current={activeChatId === chat.id ? "true" : undefined}
                          >
                            <MessageSquare className={cn(
                              "h-3.5 w-3.5 3xl:h-4 3xl:w-4 shrink-0 transition-colors duration-200",
                              activeChatId === chat.id ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                            )} aria-hidden="true" />
                            {editingId === chat.id ? (
                              <Input
                                autoFocus
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={handleKeyDown}
                                className="h-5 3xl:h-6 flex-1 min-w-0 px-1 py-0 text-[13px] 3xl:text-sm focus-visible:ring-1 focus-visible:ring-primary border-none bg-transparent"
                                aria-label="Edit chat title"
                              />
                            ) : (
                              <span className="truncate flex-1 text-left block max-w-[155px] 3xl:max-w-[185px]">{chat.title}</span>
                            )}
                          </Button>
                          
                          {/* Chat Action Menu */}
                          {!editingId && (
                            <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-7 w-7 text-muted-foreground hover:bg-transparent"
                                    aria-label={`More actions for chat: ${chat.title}`}
                                  >
                                    <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-soft-md">
                                  <DropdownMenuItem 
                                    className="gap-2 cursor-pointer text-xs py-2"
                                    onClick={() => startEditing(chat)}
                                  >
                                    <Edit2 className="h-3 w-3" aria-hidden="true" />
                                    Renombrar
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem 
                                    className="gap-2 cursor-pointer text-xs py-2"
                                    disabled={downloadingId === chat.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(chat, 'text');
                                    }}
                                  >
                                    <FileText className="h-3 w-3" aria-hidden="true" />
                                    Descargar como .txt
                                  </DropdownMenuItem>
                                  
                                  <DropdownMenuItem 
                                    className="gap-2 cursor-pointer text-xs py-2"
                                    disabled={downloadingId === chat.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(chat, 'markdown');
                                    }}
                                  >
                                    <Download className="h-3 w-3" aria-hidden="true" />
                                    Descargar como .md
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator />

                                  <DropdownMenuItem 
                                    className="gap-2 text-white focus:text-white cursor-pointer text-xs py-2"
                                    onClick={() => handleDeleteConversation(chat.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-white" aria-hidden="true" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </ScrollArea>
    </nav>
  )
}
