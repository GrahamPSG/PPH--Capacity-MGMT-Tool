'use client';

import { useState, useEffect } from 'react';
import { Division, ProjectType } from '@prisma/client';

export default function SimpleProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // New project form
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('MULTIFAMILY');
  const [division, setDivision] = useState<Division>('PLUMBING_MULTIFAMILY');
  const [contractAmount, setContractAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/simple/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/simple/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          type: projectType,
          division,
          contractAmount: parseFloat(contractAmount),
          startDate,
          endDate
        })
      });

      if (response.ok) {
        await fetchProjects();
        setShowNewProject(false);
        resetForm();
      }
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const resetForm = () => {
    setProjectName('');
    setProjectType('MULTIFAMILY');
    setDivision('PLUMBING_MULTIFAMILY');
    setContractAmount('');
    setStartDate('');
    setEndDate('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', selectedProject);

    try {
      const response = await fetch('/api/simple/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        alert(result.message);
        await fetchProjects();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed');
    }
  };

  const downloadTemplate = () => {
    window.location.href = '/api/simple/upload';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Project Management</h1>
          <button
            onClick={() => setShowNewProject(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            + New Project
          </button>
        </div>

        {/* New Project Form */}
        {showNewProject && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={createProject} className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Project Name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="border rounded px-3 py-2"
                required
              />
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as ProjectType)}
                className="border rounded px-3 py-2"
              >
                <option value="MULTIFAMILY">Multifamily</option>
                <option value="COMMERCIAL">Commercial</option>
                <option value="CUSTOM_HOME">Custom Home</option>
              </select>
              <select
                value={division}
                onChange={(e) => setDivision(e.target.value as Division)}
                className="border rounded px-3 py-2"
              >
                <option value="PLUMBING_MULTIFAMILY">Plumbing - Multifamily</option>
                <option value="PLUMBING_COMMERCIAL">Plumbing - Commercial</option>
                <option value="PLUMBING_CUSTOM">Plumbing - Custom</option>
                <option value="HVAC_MULTIFAMILY">HVAC - Multifamily</option>
                <option value="HVAC_COMMERCIAL">HVAC - Commercial</option>
                <option value="HVAC_CUSTOM">HVAC - Custom</option>
              </select>
              <input
                type="number"
                placeholder="Contract Amount"
                value={contractAmount}
                onChange={(e) => setContractAmount(e.target.value)}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded px-3 py-2"
                required
              />
              <input
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded px-3 py-2"
                required
              />
              <div className="col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewProject(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CSV Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Phase Import</h2>
          <div className="flex items-center gap-4">
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="border rounded px-3 py-2 flex-1"
            >
              <option value="">Select a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectCode} - {project.name}
                </option>
              ))}
            </select>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={!selectedProject}
              className="border rounded px-3 py-2"
            />
            <button
              onClick={downloadTemplate}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Download Template
            </button>
          </div>
        </div>

        {/* Projects List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{project.projectCode}</h3>
                  <p className="text-gray-600">{project.name}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    project.division.startsWith('PLUMBING')
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {project.division.replace('_', ' ')}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Type:</span>
                  <span>{project.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Contract:</span>
                  <span>${parseFloat(project.contractAmount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration:</span>
                  <span>
                    {new Date(project.startDate).toLocaleDateString()} -{' '}
                    {new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Phases:</span>
                  <span>{project.phases?.length || 0}</span>
                </div>
              </div>

              {project.phases && project.phases.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-semibold mb-2">Active Phases:</h4>
                  <div className="space-y-1">
                    {project.phases.slice(0, 3).map((phase: any) => (
                      <div key={phase.id} className="text-xs text-gray-600">
                        {phase.phaseNumber}. {phase.phaseName} ({phase.crewSize} crew)
                      </div>
                    ))}
                    {project.phases.length > 3 && (
                      <div className="text-xs text-gray-400">
                        +{project.phases.length - 3} more phases...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}