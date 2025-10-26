'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRight,
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Shield,
  Clock,
  CheckCircle,
  Zap,
  Building2,
  Briefcase,
  Activity
} from 'lucide-react';

export default function Home() {
  const stats = [
    { label: 'Active Projects', value: '24', change: '+12%', icon: <Briefcase className="h-5 w-5" /> },
    { label: 'Team Members', value: '48', change: '+5%', icon: <Users className="h-5 w-5" /> },
    { label: 'Utilization Rate', value: '87%', change: '+3%', icon: <Activity className="h-5 w-5" /> },
    { label: 'Revenue YTD', value: '$2.4M', change: '+18%', icon: <DollarSign className="h-5 w-5" /> }
  ];

  const features = [
    {
      title: 'Project Management',
      description: 'Track projects from quote to completion with real-time status updates',
      icon: <Briefcase className="h-6 w-6" />,
      href: '/projects',
      color: 'bg-blue-100 text-blue-700'
    },
    {
      title: 'Capacity Planning',
      description: 'Optimize workforce allocation and prevent scheduling conflicts',
      icon: <Users className="h-6 w-6" />,
      href: '/capacity',
      color: 'bg-green-100 text-green-700'
    },
    {
      title: 'Financial Dashboard',
      description: 'Monitor cash flow, billing schedules, and financial projections',
      icon: <DollarSign className="h-6 w-6" />,
      href: '/financial',
      color: 'bg-purple-100 text-purple-700'
    },
    {
      title: 'Performance Metrics',
      description: 'Track KPIs and analyze business performance in real-time',
      icon: <BarChart3 className="h-6 w-6" />,
      href: '/metrics',
      color: 'bg-orange-100 text-orange-700'
    },
    {
      title: 'Employee Management',
      description: 'Manage certifications, availability, and performance',
      icon: <Shield className="h-6 w-6" />,
      href: '/employees',
      color: 'bg-red-100 text-red-700'
    },
    {
      title: 'Reports & Analytics',
      description: 'Generate comprehensive reports for informed decision-making',
      icon: <TrendingUp className="h-6 w-6" />,
      href: '/reports',
      color: 'bg-indigo-100 text-indigo-700'
    }
  ];

  const quickActions = [
    { label: 'View Active Projects', href: '/projects', icon: <Briefcase className="h-4 w-4" /> },
    { label: 'Check Capacity', href: '/capacity', icon: <Clock className="h-4 w-4" /> },
    { label: 'Review Assignments', href: '/assignments', icon: <Calendar className="h-4 w-4" /> },
    { label: 'Financial Overview', href: '/financial', icon: <DollarSign className="h-4 w-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative container mx-auto px-6 py-16 pb-24">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div className="flex-1">
                <Image
                  src="/paris-mechanical-logo.png"
                  alt="Paris Mechanical"
                  width={280}
                  height={120}
                  className="mb-8"
                  priority
                />
                <h1 className="text-5xl font-bold text-white mb-6">
                  Capacity Management System
                </h1>
                <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-2xl">
                  Streamline operations, optimize workforce allocation, and maximize profitability
                  with our comprehensive capacity management platform.
                </p>
                <div className="flex gap-4">
                  <Link href="/dashboard">
                    <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/projects">
                    <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                      View Projects
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Stats Section - Now inside hero */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} className="shadow-lg bg-white/95 backdrop-blur">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {stat.icon}
                      </div>
                      <span className="text-sm text-green-600 font-medium">{stat.change}</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need to Manage Operations
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Comprehensive tools designed specifically for mechanical contractors to optimize
            capacity, manage projects, and drive growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Link key={index} href={feature.href}>
              <Card className="h-full hover:shadow-xl transition-shadow cursor-pointer group">
                <CardHeader>
                  <div className={`inline-flex p-3 rounded-lg ${feature.color} mb-4 group-hover:scale-110 transition-transform`}>
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                  <div className="mt-4 flex items-center text-blue-600 font-medium">
                    Learn more
                    <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 text-white">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Quick Actions</h2>
              <p className="text-gray-400 mb-8">
                Access frequently used features and stay on top of your operations with
                these quick shortcuts.
              </p>
              <div className="space-y-3">
                {quickActions.map((action, index) => (
                  <Link key={index} href={action.href}>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-white border-gray-700 hover:bg-gray-800"
                    >
                      {action.icon}
                      <span className="ml-3">{action.label}</span>
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-8">
              <h3 className="text-xl font-semibold mb-6">System Benefits</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">30% Increase in Utilization</p>
                    <p className="text-sm text-gray-400">Optimize workforce allocation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">50% Reduction in Conflicts</p>
                    <p className="text-sm text-gray-400">Prevent double-booking and overallocation</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Real-time Insights</p>
                    <p className="text-sm text-gray-400">Make data-driven decisions instantly</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Automated Reporting</p>
                    <p className="text-sm text-gray-400">Save hours on manual report generation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-6 w-6 text-blue-600" />
                <span className="font-semibold text-gray-900">PPH Capacity Manager</span>
              </div>
              <p className="text-sm text-gray-600">
                Optimizing mechanical contractor operations since 2024.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="/projects" className="hover:text-blue-600">Projects</Link></li>
                <li><Link href="/capacity" className="hover:text-blue-600">Capacity Planning</Link></li>
                <li><Link href="/financial" className="hover:text-blue-600">Financial</Link></li>
                <li><Link href="/reports" className="hover:text-blue-600">Reports</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-600">API Reference</a></li>
                <li><a href="#" className="hover:text-blue-600">Support</a></li>
                <li><a href="#" className="hover:text-blue-600">Training</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-blue-600">About Us</a></li>
                <li><a href="#" className="hover:text-blue-600">Contact</a></li>
                <li><a href="#" className="hover:text-blue-600">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-gray-600">
            © 2024 Paris Plumbing & Heating. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}