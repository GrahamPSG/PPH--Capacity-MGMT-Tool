'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Division, PhaseStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

// Schema for phase creation
const phaseSchema = z.object({
  projectId: z.string().uuid(),
  phaseNumber: z.number().int().min(1).max(20),
  name: z.string().min(3).max(200),
  division: z.nativeEnum(Division),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  actualStartDate: z.string().datetime().optional(),
  actualEndDate: z.string().datetime().optional(),
  duration: z.number().int().min(1).max(365),
  requiredCrewSize: z.number().int().min(0).max(20).default(0),
  requiredForeman: z.boolean().default(false),
  requiredJourneymen: z.number().int().min(0).max(20).default(0),
  requiredApprentices: z.number().int().min(0).max(20).default(0),
  laborHours: z.number().int().min(0).max(10000).default(0),
  dependencies: z.array(z.string().uuid()).optional(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate']
});

export type PhaseFormData = z.infer<typeof phaseSchema>;

interface PhaseFormProps {
  projectId: string;
  projectDivision?: Division;
  existingPhases?: Array<{ id: string; name: string; phaseNumber: number }>;
  onSubmit: (data: PhaseFormData) => Promise<void>;
  onCancel?: () => void;
  mode?: 'create' | 'edit';
  initialData?: Partial<PhaseFormData>;
}

export function PhaseForm({
  projectId,
  projectDivision,
  existingPhases = [],
  onSubmit,
  onCancel,
  mode = 'create',
  initialData
}: PhaseFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm<PhaseFormData>({
    resolver: zodResolver(phaseSchema),
    defaultValues: {
      projectId,
      division: projectDivision || Division.PLUMBING_MULTIFAMILY,
      phaseNumber: existingPhases.length + 1,
      requiredCrewSize: 0,
      requiredForeman: false,
      requiredJourneymen: 0,
      requiredApprentices: 0,
      laborHours: 0,
      dependencies: [],
      ...initialData
    }
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const requiredForeman = watch('requiredForeman');

  // Calculate duration when dates change
  React.useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setValue('duration', diffDays);
    }
  }, [startDate, endDate, setValue]);

  const handleFormSubmit = async (data: PhaseFormData) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await onSubmit(data);
      setSubmitSuccess(true);

      if (mode === 'create') {
        reset({
          ...data,
          phaseNumber: data.phaseNumber + 1,
          name: '',
          dependencies: []
        });
        setTimeout(() => setSubmitSuccess(false), 3000);
      }
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to save phase. Please try again.';
      setSubmitError(message);
      console.error('Phase form submission error:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Create New Phase' : 'Edit Phase'}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Error Alert */}
        {submitError && (
          <Alert variant="destructive" className="mb-6">
            <div className="flex items-start justify-between">
              <div className="flex">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertDescription>{submitError}</AlertDescription>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="ml-4 text-sm hover:text-red-800"
              >
                ×
              </button>
            </div>
          </Alert>
        )}

        {/* Success Alert */}
        {submitSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Phase {mode === 'create' ? 'created' : 'updated'} successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phaseNumber">Phase Number *</Label>
              <Input
                id="phaseNumber"
                type="number"
                {...register('phaseNumber', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.phaseNumber && (
                <p className="text-sm text-red-600">{errors.phaseNumber.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Phase Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Rough-in Plumbing, HVAC Installation"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>
          </div>

          {/* Division and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="division">Division *</Label>
              <Select
                value={watch('division')}
                onValueChange={(value) => setValue('division', value as Division)}
                disabled={isSubmitting || !!projectDivision}
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

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="datetime-local"
                {...register('startDate')}
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              />
              {errors.endDate && (
                <p className="text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Duration and Labor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (days)</Label>
              <Input
                id="duration"
                type="number"
                {...register('duration', { valueAsNumber: true })}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="laborHours">Labor Hours *</Label>
              <Input
                id="laborHours"
                type="number"
                {...register('laborHours', { valueAsNumber: true })}
                placeholder="0"
                disabled={isSubmitting}
              />
              {errors.laborHours && (
                <p className="text-sm text-red-600">{errors.laborHours.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="requiredCrewSize">Required Crew Size *</Label>
              <Input
                id="requiredCrewSize"
                type="number"
                {...register('requiredCrewSize', { valueAsNumber: true })}
                placeholder="0"
                disabled={isSubmitting}
              />
              {errors.requiredCrewSize && (
                <p className="text-sm text-red-600">{errors.requiredCrewSize.message}</p>
              )}
            </div>
          </div>

          {/* Crew Requirements */}
          <div className="space-y-4">
            <Label>Crew Requirements</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  id="requiredForeman"
                  type="checkbox"
                  {...register('requiredForeman')}
                  disabled={isSubmitting}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="requiredForeman" className="font-normal">
                  Requires Foreman
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredJourneymen">Journeymen</Label>
                <Input
                  id="requiredJourneymen"
                  type="number"
                  {...register('requiredJourneymen', { valueAsNumber: true })}
                  placeholder="0"
                  disabled={isSubmitting}
                />
                {errors.requiredJourneymen && (
                  <p className="text-sm text-red-600">{errors.requiredJourneymen.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="requiredApprentices">Apprentices</Label>
                <Input
                  id="requiredApprentices"
                  type="number"
                  {...register('requiredApprentices', { valueAsNumber: true })}
                  placeholder="0"
                  disabled={isSubmitting}
                />
                {errors.requiredApprentices && (
                  <p className="text-sm text-red-600">{errors.requiredApprentices.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Dependencies */}
          {existingPhases.length > 0 && (
            <div className="space-y-2">
              <Label>Dependencies (Optional)</Label>
              <div className="space-y-2 p-4 border rounded-lg max-h-40 overflow-y-auto">
                {existingPhases.map(phase => (
                  <div key={phase.id} className="flex items-center space-x-2">
                    <input
                      id={`dep-${phase.id}`}
                      type="checkbox"
                      value={phase.id}
                      onChange={(e) => {
                        const currentDeps = watch('dependencies') || [];
                        if (e.target.checked) {
                          setValue('dependencies', [...currentDeps, phase.id]);
                        } else {
                          setValue('dependencies', currentDeps.filter(id => id !== phase.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300"
                      disabled={isSubmitting}
                    />
                    <Label htmlFor={`dep-${phase.id}`} className="font-normal">
                      Phase {phase.phaseNumber}: {phase.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="flex justify-end gap-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === 'create' ? 'Create Phase' : 'Update Phase'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}