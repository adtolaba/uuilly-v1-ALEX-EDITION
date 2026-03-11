/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect } from "react"
import { Search, MoreHorizontal, UserPlus, Mail, Shield, Tag, Loader2, Trash2 } from "lucide-react"
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
import { UserSearch } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { UserForm } from "./UserForm"
import { getTagColor, cn } from "@/lib/utils"
import useUI from "../../hooks/useUI"

/**
 * UserManagement component for viewing and managing system users.
 * @returns {JSX.Element}
 */
export function UserManagement({ currentUser }) {
  const ui = useUI()
  const isAdmin = currentUser?.role === "ADMIN"
  const isSupervisor = currentUser?.role === "SUPERVISOR"
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch("/api/v1/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteUser = async (user) => {
    ui.confirm(
      "Delete User",
      `Are you sure you want to delete ${user.email}?`,
      async () => {
        try {
          const token = localStorage.getItem("access_token")
          const response = await fetch(`/api/v1/users/${user.id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
          if (response.ok) {
            ui.toast.success(`User ${user.email} deleted successfully`)
            fetchUsers()
          } else {
            const data = await response.json()
            ui.toast.error(data.detail || "Error deleting user")
          }
        } catch (error) {
          console.error("Error deleting user:", error)
          ui.toast.error("Connection error")
        }
      }
    )
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const handleAddUser = () => {
    setEditingUser(null)
    setIsFormOpen(true)
  }

  const filteredUsers = users.filter(
    (user) => {
      const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.first_name && user.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.last_name && user.last_name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (isAdmin) return matchesSearch;
      if (isSupervisor) return matchesSearch && user.role === "USER";
      return matchesSearch;
    }
  )

  return (
    <div className="flex flex-col h-full space-y-4 min-h-0">
      <div className="flex items-center justify-between gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Button className="gap-2" onClick={handleAddUser}>
          <UserPlus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <ScrollArea className="flex-1 min-h-0 rounded-xl border bg-card/30 backdrop-blur-sm shadow-soft">
        <Table>
          <TableHeader className="bg-secondary sticky top-0 z-10">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 pl-6">User</TableHead>
              <TableHead className="text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-6">Role</TableHead>
              <TableHead className="text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 px-6">Tags</TableHead>
              <TableHead className="text-right text-[10px] 3xl:text-xs font-bold uppercase tracking-wider text-muted-foreground/50 py-3 pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center px-6">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground/50">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading users...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center px-6">
                  <div className="flex justify-center">
                    <Alert className="max-w-xs border-dashed bg-muted/20">
                      <UserSearch className="h-4 w-4" />
                      <AlertDescription>No users found matching your search.</AlertDescription>
                    </Alert>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="pl-6">
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.first_name || user.last_name 
                          ? `${user.first_name || ""} ${user.last_name || ""}`.trim() 
                          : "No name"}
                      </span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-6">
                    <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6">
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(user.tags) && user.tags.length > 0 ? (
                        user.tags.map((tag) => {
                          const colors = getTagColor(tag.name);
                          return (
                            <Badge 
                              key={tag.id} 
                              variant="outline" 
                              className={cn("text-[10px] 3xl:text-xs px-1.5 py-0 border", colors.bg, colors.text, colors.border)}
                            >
                              {tag.name}
                            </Badge>
                          );
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No tags</span>
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
                        <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => handleEditUser(user)}>
                          <Mail className="h-4 w-4" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" /> Delete User
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

      <UserForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        user={editingUser} 
        onSuccess={fetchUsers} 
        currentUser={currentUser}
      />
    </div>
  )
}
