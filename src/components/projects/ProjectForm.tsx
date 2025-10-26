'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createProjectSchema, CreateProjectInput } from '@/services/projects/ProjectValidator';
import { ProjectType, ProjectStatus, Division } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface ProjectFormProps {
  onSubmit: (data: CreateProjectInput) => Promise<void>;
  initialData?: Partial<CreateProjectInput>;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

export function ProjectForm({ onSubmit, initialData, isLoading = false, mode = 'create' }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      status: ProjectStatus.QUOTED,
      crewSize: 0,
      ...initialData
    }
  });

  const division = watch('division');
  const projectType = watch('type');

  const handleFormSubmit = async (data: CreateProjectInput) => {
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Create New Project' : 'Edit Project'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Project Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter project name"
                disabled={isLoading || isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                {...register('clientName')}
                placeholder="Enter client name"
                disabled={isLoading || isSubmitting}
              />
              {errors.clientName && (
                <p className="text-sm text-red-600">{errors.clientName.message}</p>
              )}
            </div>
          </div>

          {/* Type and Division */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Project Type *</Label>
              <Select
                value={projectType}
                onValueChange={(value) => setValue('type', value as ProjectType)}
                disabled={isLoading || isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ProjectType.MULTIFAMILY}>Multifamily</SelectItem>
                  <SelectItem value={ProjectType.COMMERCIAL}>Commercial</SelectItem>
                  <SelectItem value={ProjectType.CUSTOM_HOME}>Custom Home</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-red-600">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="division">Division *</Label>
              <Select
                value={division}
                onValueChange={(value) => setValue('division', value as Division)}
                disabled={isLoading || isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={Division.PLUMBING_MULTIFAMILY}>Plumbing - Multifamily</SelectItem>
                  <SelectItem value={Division.PLUMBING_COMMERCIAL}>Plumbing - Commercial</SelectItem>
                  <SelectItem value={Division.PLUMBING_CUSTOM}>Plumbing - Custom</SelectItem>
                  <SelectItem value={Division.HVAC_MULTIFAMILY}>HVAC - Multifamily</SelectItem>
                  <SelectItem value={Division.HVAC_COMMERCIAL}>HVAC - Commercial</SelectItem>
                  <SelectItem value={Division.HVAC_CUSTOM}>HVAC - Custom</SelectItem>
                </SelectContent>
              </Select>
              {errors.division && (
                <p className="text-sm text-red-600">{errors.division.message}</p>
              )}
            </div>
          </div>

          {/* Dates and Contract */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractAmount">Contract Amount *</Label>
              <Input
                id="contractAmount"
                type="number"
                step="0.01"
                {...register('contractAmount', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isLoading || isSubmitting}
              />
              {errors.contractAmount && (
                <p className="text-sm text-red-600">{errors.contractAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                {...register('startDate')}
                disabled={isLoading || isSubmitting}
              />
              {errors.startDate && (
                <p className="text-sm text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date *</Label>
              <Input
                id="endDate"
                type="datetime-local"
                {...register('endDate')}
                disabled={isLoading || isSubmitting}
              />
              {errors.endDate && (
                <p className="text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="crewSize">Initial Crew Size</Label>
              <Input
                id="crewSize"
                type="number"
                {...register('crewSize', { valueAsNumber: true })}
                placeholder="0"
                disabled={isLoading || isSubmitting}
              />
              {errors.crewSize && (
                <p className="text-sm text-red-600">{errors.crewSize.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientContact">Client Contact</Label>
              <Input
                id="clientContact"
                {...register('clientContact')}
                placeholder="Phone or email"
                disabled={isLoading || isSubmitting}
              />
              {errors.clientContact && (
                <p className="text-sm text-red-600">{errors.clientContact.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Project Address</Label>
            <Input
              id="address"
              {...register('address')}
              placeholder="Enter project address"
              disabled={isLoading || isSubmitting}
            />
            {errors.address && (
              <p className="text-sm text-red-600">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional project notes..."
              rows={4}
              disabled={isLoading || isSubmitting}
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="submit"
              disabled={isLoading || isSubmitting}
              className="min-w-[100px]"
            >
              {(isLoading || isSubmitting) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === 'create' ? 'Create Project' : 'Update Project'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}