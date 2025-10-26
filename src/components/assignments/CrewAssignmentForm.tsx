'use client';

import React, { useState, useEffect } from 'react';
import { EmployeeType } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  CheckCircle,
  Users,
  Calendar,
  Clock,
  UserPlus,
  X
} from 'lucide-react';

interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  employeeType: EmployeeType;
  division: string;
  hourlyRate: number;
  maxHoursPerWeek: number;
}

interface Phase {
  id: string;
  name: string;
  phaseNumber: number;
  startDate: string | Date;
  endDate: string | Date;
  requiredCrewSize: number;
  requiredForeman: boolean;
  requiredJourneymen: number;
  requiredApprentices: number;
  division: string;
}

interface Assignment {
  employeeId: string;
  hoursAllocated: number;
  role: EmployeeType;
  isLead: boolean;
}

interface CrewAssignmentFormProps {
  phase: Phase;
  availableEmployees: Employee[];
  existingAssignments?: Assignment[];
  onSubmit: (phaseId: string, assignments: Assignment[]) => Promise<void>;
  onCancel?: () => void;
}

export function CrewAssignmentForm({
  phase,
  availableEmployees,
  existingAssignments = [],
  onSubmit,
  onCancel
}: CrewAssignmentFormProps) {
  const [assignments, setAssignments] = useState<Assignment[]>(existingAssignments);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [hoursAllocated, setHoursAllocated] = useState<number>(40);
  const [isLead, setIsLead] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter employees by division and availability
  const eligibleEmployees = availableEmployees.filter(emp => {
    // Must match division
    if (emp.division !== phase.division) return false;
    // Cannot be already assigned
    if (assignments.some(a => a.employeeId === emp.id)) return false;
    return true;
  });

  // Calculate crew requirements status
  const currentCrew = {
    foreman: assignments.filter(a => a.role === EmployeeType.FOREMAN).length,
    journeymen: assignments.filter(a => a.role === EmployeeType.JOURNEYMAN).length,
    apprentices: assignments.filter(a => a.role === EmployeeType.APPRENTICE).length,
    total: assignments.length
  };

  const requirements = {
    foreman: phase.requiredForeman ? 1 : 0,
    journeymen: phase.requiredJourneymen || 0,
    apprentices: phase.requiredApprentices || 0,
    total: phase.requiredCrewSize || 0
  };

  const isFullyStaffed =
    currentCrew.foreman >= requirements.foreman &&
    currentCrew.journeymen >= requirements.journeymen &&
    currentCrew.apprentices >= requirements.apprentices &&
    currentCrew.total >= requirements.total;

  const addAssignment = () => {
    const employee = eligibleEmployees.find(e => e.id === selectedEmployeeId);
    if (!employee) {
      setSubmitError('Please select an employee');
      return;
    }

    const newAssignment: Assignment = {
      employeeId: employee.id,
      hoursAllocated,
      role: employee.employeeType,
      isLead: isLead && employee.employeeType === EmployeeType.FOREMAN
    };

    setAssignments([...assignments, newAssignment]);
    setSelectedEmployeeId('');
    setHoursAllocated(40);
    setIsLead(false);
    setSubmitError(null);
  };

  const removeAssignment = (employeeId: string) => {
    setAssignments(assignments.filter(a => a.employeeId !== employeeId));
  };

  const updateAssignmentHours = (employeeId: string, hours: number) => {
    setAssignments(assignments.map(a =>
      a.employeeId === employeeId ? { ...a, hoursAllocated: hours } : a
    ));
  };

  const toggleLead = (employeeId: string) => {
    setAssignments(assignments.map(a =>
      a.employeeId === employeeId ? { ...a, isLead: !a.isLead } : a
    ));
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    setSubmitSuccess(false);
    setIsSubmitting(true);

    try {
      await onSubmit(phase.id, assignments);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to save assignments. Please try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = availableEmployees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
  };

  const getEmployeeCode = (employeeId: string) => {
    const employee = availableEmployees.find(e => e.id === employeeId);
    return employee?.employeeCode || '';
  };

  const getRoleColor = (role: EmployeeType) => {
    switch (role) {
      case EmployeeType.FOREMAN:
        return 'bg-purple-500';
      case EmployeeType.JOURNEYMAN:
        return 'bg-blue-500';
      case EmployeeType.APPRENTICE:
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Crew Assignment - Phase {phase.phaseNumber}: {phase.name}
          </CardTitle>
          {isFullyStaffed && (
            <Badge className="bg-green-500">
              <CheckCircle className="h-4 w-4 mr-1" />
              Fully Staffed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {submitSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Crew assignments saved successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Requirements Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Crew Requirements</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Total Crew</Label>
              <div className="font-medium">
                {currentCrew.total} / {requirements.total}
              </div>
            </div>
            {requirements.foreman > 0 && (
              <div>
                <Label className="text-gray-600">Foreman</Label>
                <div className={`font-medium ${currentCrew.foreman < requirements.foreman ? 'text-red-600' : 'text-green-600'}`}>
                  {currentCrew.foreman} / {requirements.foreman}
                </div>
              </div>
            )}
            {requirements.journeymen > 0 && (
              <div>
                <Label className="text-gray-600">Journeymen</Label>
                <div className={`font-medium ${currentCrew.journeymen < requirements.journeymen ? 'text-red-600' : 'text-green-600'}`}>
                  {currentCrew.journeymen} / {requirements.journeymen}
                </div>
              </div>
            )}
            {requirements.apprentices > 0 && (
              <div>
                <Label className="text-gray-600">Apprentices</Label>
                <div className={`font-medium ${currentCrew.apprentices < requirements.apprentices ? 'text-red-600' : 'text-green-600'}`}>
                  {currentCrew.apprentices} / {requirements.apprentices}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Current Assignments */}
        {assignments.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">Current Assignments</h3>
            <div className="space-y-2">
              {assignments.map((assignment) => {
                const employee = availableEmployees.find(e => e.id === assignment.employeeId);
                return (
                  <div
                    key={assignment.employeeId}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleColor(assignment.role)}>
                        {assignment.role}
                      </Badge>
                      <div>
                        <div className="font-medium">
                          {getEmployeeCode(assignment.employeeId)} - {getEmployeeName(assignment.employeeId)}
                        </div>
                        {assignment.isLead && (
                          <Badge variant="outline" className="mt-1">Lead</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <Input
                          type="number"
                          value={assignment.hoursAllocated}
                          onChange={(e) => updateAssignmentHours(assignment.employeeId, parseInt(e.target.value))}
                          className="w-16 h-8"
                          min="1"
                          max={employee?.maxHoursPerWeek || 40}
                        />
                        <span className="text-sm text-gray-500">hrs/wk</span>
                      </div>
                      {assignment.role === EmployeeType.FOREMAN && (
                        <Button
                          size="sm"
                          variant={assignment.isLead ? "default" : "outline"}
                          onClick={() => toggleLead(assignment.employeeId)}
                        >
                          Lead
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeAssignment(assignment.employeeId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Add New Assignment */}
        {eligibleEmployees.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Add Crew Member</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="employee">Select Employee</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an employee..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleEmployees.map(employee => (
                      <SelectItem key={employee.id} value={employee.id}>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getRoleColor(employee.employeeType)} text-xs`}>
                            {employee.employeeType}
                          </Badge>
                          {employee.employeeCode} - {employee.firstName} {employee.lastName}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="hours">Hours/Week</Label>
                <Input
                  id="hours"
                  type="number"
                  value={hoursAllocated}
                  onChange={(e) => setHoursAllocated(parseInt(e.target.value))}
                  min="1"
                  max="40"
                />
              </div>

              <div className="flex items-end">
                <Button
                  onClick={addAssignment}
                  disabled={!selectedEmployeeId}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </div>
          </div>
        )}

        {eligibleEmployees.length === 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No eligible employees available for this phase's division ({phase.division}).
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || assignments.length === 0}
          >
            {isSubmitting ? 'Saving...' : 'Save Assignments'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}