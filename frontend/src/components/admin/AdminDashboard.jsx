/*
 * Copyright (c) 2026 Gustavo Alejandro Medde.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE.md in the project root for more information.
 */

import React, { useState, useEffect } from "react"
import { Users, Bot, Tag, Activity, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * AdminDashboard component that displays system statistics and activity.
 * @param {Object} props
 * @param {Object} props.currentUser The currently logged in user.
 * @param {boolean} props.isWsConnected WebSocket connection status.
 * @returns {JSX.Element}
 */
export function AdminDashboard({ currentUser, isWsConnected }) {
  const isAdmin = currentUser?.role === 'ADMIN';
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalTags: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const token = localStorage.getItem("access_token")
        const headers = { Authorization: `Bearer ${token}` }
        
        // Conditional fetch based on role
        if (isAdmin) {
          const [usersRes, agentsRes, tagsRes] = await Promise.all([
            fetch("/api/v1/users", { headers }),
            fetch("/api/v1/agents", { headers }),
            fetch("/api/v1/tags", { headers })
          ])

          if (usersRes.ok && agentsRes.ok && tagsRes.ok) {
            const [users, agents, tags] = await Promise.all([
              usersRes.json(),
              agentsRes.json(),
              tagsRes.json()
            ])
            
            setStats({
              totalUsers: users.length,
              totalAgents: agents.length,
              totalTags: tags.length
            })
          }
        } else {
          // Supervisors (or others) only see what they can access
          const usersRes = await fetch("/api/v1/users", { headers })
          if (usersRes.ok) {
            const users = await usersRes.json()
            setStats({
              totalUsers: users.length,
              totalAgents: 0, // Restricted
              totalTags: 0    // Restricted
            })
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [isAdmin])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "..." : stats.totalUsers}</div>
          </CardContent>
        </Card>
        {isAdmin && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Asistentes Activos</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats.totalAgents}</div>
            </CardContent>
          </Card>
        )}
        {isAdmin && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Etiquetas Globales</CardTitle>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? "..." : stats.totalTags}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Actividad del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div className="flex items-center">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                   <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none text-muted-foreground italic">
                    Próximamente: Feed de actividad en tiempo real.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Información Rápida</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Base de Datos: Optimizada</span>
              </div>
              <div className="flex items-center gap-2">
                {isWsConnected ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm font-medium">
                  WebSocket: {isWsConnected ? "Conectado" : "Desconectado"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground opacity-50">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm">Latencia API: 45ms</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
