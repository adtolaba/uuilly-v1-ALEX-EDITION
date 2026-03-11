/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { X, ChevronDown, Tag } from "lucide-react"
import { cn, getTagColor } from "@/lib/utils"
import useUI from "../../hooks/useUI"

/**
 * UserForm component for creating or editing user details.
 * @param {Object} props
 * @param {Object} props.user The user to edit, or null for a new user.
 * @param {boolean} props.open Whether the form sheet is open.
 * @param {function} props.onOpenChange Callback when the open state changes.
 * @param {function} props.onSuccess Callback when the user is successfully saved.
 * @returns {JSX.Element}
 */
export function UserForm({ user, open, onOpenChange, onSuccess, currentUser }) {
  const ui = useUI()
  const isAdmin = currentUser?.role === 'ADMIN';
  const isSupervisor = currentUser?.role === 'SUPERVISOR';
  const [email, setEmail] = useState("")
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("")
  const [role, setRole] = useState("USER")
  const [password, setPassword] = useState("")
  const [tags, setTags] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [allGlobalTags, setAllGlobalTags] = useState([])

  useEffect(() => {
    if (isAdmin) {
      fetchGlobalTags()
    }
  }, [isAdmin])

  const fetchGlobalTags = async () => {
    try {
      const token = localStorage.getItem("access_token")
      const response = await fetch("/api/v1/tags", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setAllGlobalTags(data)
      }
    } catch (error) {
      console.error("Error fetching global tags:", error)
    }
  }

  useEffect(() => {
    if (user) {
      setEmail(user.email || "")
      setFirstName(user.first_name || "")
      setLastName(user.last_name || "")
      setProfilePhotoUrl(user.profile_photo_url || "")
      setRole(user.role || "USER")
      setPassword("") // Never populate password from existing data
      setTags(user.tags ? user.tags.map(t => typeof t === 'string' ? t : t.name) : [])
    } else {
      setEmail("")
      setFirstName("")
      setLastName("")
      setProfilePhotoUrl("")
      setRole("USER")
      setPassword("")
      setTags([])
    }
  }, [user, open])

  const toggleTag = (tagName) => {
    if (tags.includes(tagName)) {
      setTags(tags.filter(t => t !== tagName))
    } else {
      setTags([...tags, tagName])
    }
  }

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    const token = localStorage.getItem("access_token")
    const method = user ? "PUT" : "POST"
    const url = user ? `/api/v1/users/${user.id}` : "/api/v1/users"

    const body = {
      email,
      first_name: firstName,
      last_name: lastName,
      profile_photo_url: profilePhotoUrl,
      role,
      tags: tags
    }

    if (password) {
      body.password = password
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        ui.toast.success(`User ${email} saved successfully`)
        onSuccess()
        onOpenChange(false)
      } else {
        const errorData = await response.json()
        ui.toast.error(errorData.detail || "Error saving user")
      }
    } catch (error) {
      console.error("Error saving user:", error)
      ui.toast.error("Connection error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[425px] overflow-y-auto custom-scrollbar">
        <form onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetTitle>{user ? "Edit User" : "Add New User"}</SheetTitle>
            <SheetDescription className="sr-only">
              Form to manage user details and tags.
            </SheetDescription>
          </SheetHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="first_name" className="text-sm font-medium">First Name</label>
                <Input
                  id="first_name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="last_name" className="text-sm font-medium">Last Name</label>
                <Input
                  id="last_name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <label htmlFor="profile_photo_url" className="text-sm font-medium">Profile Photo URL</label>
              <Input
                id="profile_photo_url"
                type="url"
                value={profilePhotoUrl}
                onChange={(e) => setProfilePhotoUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="role" className="text-sm font-medium">Role</label>
              <Select 
                value={role} 
                onValueChange={setRole} 
                disabled={!isAdmin}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
              {!isAdmin && (
                <p className="text-[10px] text-muted-foreground italic">Only Administrators can change user roles.</p>
              )}
            </div>

            {isAdmin && (
              <div className="grid gap-2">
                <label htmlFor="password" { ...{ className: "text-sm font-medium" } }>Password (Optional)</label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={user ? "Leave empty to keep current" : "Set password for manual login"}
                  autoComplete="new-password"
                />
                <p className="text-[10px] text-muted-foreground italic">Users without passwords must use Google OAuth.</p>
              </div>
            )}
            
            <div className="grid gap-2 relative">
              <label className="text-sm font-medium">Tags</label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full justify-between font-normal text-muted-foreground hover:text-foreground"
                  >
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>Select tags...</span>
                    </div>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[300px] max-h-[300px] overflow-y-auto custom-scrollbar" align="start">
                  <DropdownMenuLabel>Available Tags</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {allGlobalTags.length === 0 ? (
                    <div className="p-2 text-xs text-muted-foreground italic text-center">No tags available</div>
                  ) : (
                    allGlobalTags.map((tag) => (
                      <DropdownMenuCheckboxItem
                        key={tag.id}
                        checked={tags.includes(tag.name)}
                        onCheckedChange={() => toggleTag(tag.name)}
                        onSelect={(e) => e.preventDefault()} // Keep open
                      >
                        {tag.name}
                      </DropdownMenuCheckboxItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => {
                  const colors = getTagColor(tag);
                  return (
                    <Badge 
                      key={tag} 
                      variant="outline" 
                      className={cn("pl-2 pr-1 py-0.5 gap-1 group transition-all border", colors.bg, colors.text, colors.border)}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="rounded-full opacity-60 hover:opacity-100 hover:bg-muted p-0.5 transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
                {tags.length === 0 && (
                  <span className="text-[10px] 3xl:text-xs text-muted-foreground italic">No tags selected</span>
                )}
              </div>
            </div>
          </div>
          <SheetFooter className="pt-4 border-t">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : (user ? "Update User" : "Save User")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
