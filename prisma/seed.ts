import { PrismaClient, UserRole, Division, EmployeeType, ProjectType, ProjectStatus, PhaseStatus, ExpenseCategory, AlertType, AlertSeverity } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.mondaySync.deleteMany();
  await prisma.laborForecast.deleteMany();
  await prisma.capacitySnapshot.deleteMany();
  await prisma.projectExpense.deleteMany();
  await prisma.scheduleOfValues.deleteMany();
  await prisma.crewAssignment.deleteMany();
  await prisma.projectPhase.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.user.deleteMany();

  // Create Users (one for each role)
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: 'owner@parismechanical.com',
        firstName: 'John',
        lastName: 'Owner',
        role: UserRole.OWNER,
        divisionAccess: [Division.PLUMBING_MULTIFAMILY, Division.PLUMBING_COMMERCIAL, Division.HVAC_MULTIFAMILY, Division.HVAC_COMMERCIAL],
        phoneNumber: '555-0100',
        auth0Id: 'auth0|owner123',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'manager@parismechanical.com',
        firstName: 'Sarah',
        lastName: 'Manager',
        role: UserRole.MANAGER,
        divisionAccess: [Division.PLUMBING_MULTIFAMILY, Division.PLUMBING_COMMERCIAL],
        phoneNumber: '555-0101',
        auth0Id: 'auth0|manager123',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'pm@parismechanical.com',
        firstName: 'Mike',
        lastName: 'ProjectManager',
        role: UserRole.PROJECT_MANAGER,
        divisionAccess: [Division.PLUMBING_MULTIFAMILY],
        phoneNumber: '555-0102',
        auth0Id: 'auth0|pm123',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'foreman@parismechanical.com',
        firstName: 'Bob',
        lastName: 'Foreman',
        role: UserRole.FOREMAN,
        divisionAccess: [Division.PLUMBING_MULTIFAMILY],
        phoneNumber: '555-0103',
        auth0Id: 'auth0|foreman123',
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'viewer@parismechanical.com',
        firstName: 'Alice',
        lastName: 'Viewer',
        role: UserRole.READ_ONLY,
        divisionAccess: [Division.PLUMBING_MULTIFAMILY, Division.PLUMBING_COMMERCIAL, Division.PLUMBING_CUSTOM],
        phoneNumber: '555-0104',
        auth0Id: 'auth0|readonly123',
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create Employees
  const employees = await Promise.all([
    // Foremen
    prisma.employee.create({
      data: {
        employeeCode: 'EMP001',
        firstName: 'Tom',
        lastName: 'Wilson',
        division: Division.PLUMBING_MULTIFAMILY,
        employeeType: EmployeeType.FOREMAN,
        hourlyRate: 65.00,
        overtimeRate: 97.50,
        maxHoursPerWeek: 50,
        skills: ['Project Management', 'Plumbing', 'Leadership'],
        certifications: ['Master Plumber', 'OSHA 30'],
        availabilityStart: new Date(),
        isActive: true,
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: 'EMP002',
        firstName: 'James',
        lastName: 'Brown',
        division: Division.HVAC_COMMERCIAL,
        employeeType: EmployeeType.FOREMAN,
        hourlyRate: 68.00,
        overtimeRate: 102.00,
        maxHoursPerWeek: 50,
        skills: ['HVAC Systems', 'Commercial', 'Team Management'],
        certifications: ['HVAC Master', 'EPA Universal'],
        availabilityStart: new Date(),
        isActive: true,
      },
    }),
    // Journeymen
    prisma.employee.create({
      data: {
        employeeCode: 'EMP003',
        firstName: 'David',
        lastName: 'Smith',
        division: Division.PLUMBING_MULTIFAMILY,
        employeeType: EmployeeType.JOURNEYMAN,
        hourlyRate: 45.00,
        overtimeRate: 67.50,
        maxHoursPerWeek: 40,
        skills: ['Residential Plumbing', 'Pipe Fitting'],
        certifications: ['Journeyman Plumber'],
        availabilityStart: new Date(),
        isActive: true,
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: 'EMP004',
        firstName: 'Robert',
        lastName: 'Johnson',
        division: Division.PLUMBING_MULTIFAMILY,
        employeeType: EmployeeType.JOURNEYMAN,
        hourlyRate: 47.00,
        overtimeRate: 70.50,
        maxHoursPerWeek: 40,
        skills: ['Commercial Plumbing', 'Welding'],
        certifications: ['Journeyman Plumber', 'Welding Cert'],
        availabilityStart: new Date(),
        isActive: true,
      },
    }),
    // Apprentices
    prisma.employee.create({
      data: {
        employeeCode: 'EMP005',
        firstName: 'Kevin',
        lastName: 'Anderson',
        division: Division.PLUMBING_MULTIFAMILY,
        employeeType: EmployeeType.APPRENTICE,
        hourlyRate: 25.00,
        overtimeRate: 37.50,
        maxHoursPerWeek: 40,
        skills: ['Basic Plumbing', 'Tool Operation'],
        certifications: ['OSHA 10'],
        availabilityStart: new Date(),
        isActive: true,
      },
    }),
    prisma.employee.create({
      data: {
        employeeCode: 'EMP006',
        firstName: 'Chris',
        lastName: 'Martinez',
        division: Division.HVAC_COMMERCIAL,
        employeeType: EmployeeType.APPRENTICE,
        hourlyRate: 26.00,
        overtimeRate: 39.00,
        maxHoursPerWeek: 40,
        skills: ['HVAC Basics', 'Ductwork'],
        certifications: ['EPA Section 608'],
        availabilityStart: new Date(),
        isActive: true,
      },
    }),
  ]);

  console.log(`✅ Created ${employees.length} employees`);

  // Create Projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        projectCode: 'PRJ-2024-001',
        name: 'Sunset Towers Plumbing',
        type: ProjectType.MULTIFAMILY,
        division: Division.PLUMBING_MULTIFAMILY,
        status: ProjectStatus.IN_PROGRESS,
        contractAmount: 850000.00,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-12-31'),
        actualStartDate: new Date('2024-01-20'),
        foremanId: employees[0].id, // Tom Wilson
        crewSize: 5,
        address: '123 Sunset Blvd, Vancouver, BC',
        clientName: 'Sunset Development Corp',
        clientContact: 'John Client (555-1234)',
        mondayBoardId: 'board_123',
        mondayItemId: 'item_456',
        notes: 'Large multifamily complex, 150 units',
        createdById: users[1].id, // Manager
        modifiedById: users[1].id,
      },
    }),
    prisma.project.create({
      data: {
        projectCode: 'PRJ-2024-002',
        name: 'Pacific Mall HVAC Retrofit',
        type: ProjectType.COMMERCIAL,
        division: Division.HVAC_COMMERCIAL,
        status: ProjectStatus.IN_PROGRESS,
        contractAmount: 1200000.00,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-10-31'),
        actualStartDate: new Date('2024-02-05'),
        foremanId: employees[1].id, // James Brown
        crewSize: 4,
        address: '456 Pacific Ave, Vancouver, BC',
        clientName: 'Pacific Properties Ltd',
        clientContact: 'Jane Manager (555-5678)',
        mondayBoardId: 'board_124',
        mondayItemId: 'item_457',
        notes: 'Complete HVAC system replacement',
        createdById: users[1].id,
        modifiedById: users[1].id,
      },
    }),
    prisma.project.create({
      data: {
        projectCode: 'PRJ-2024-003',
        name: 'Riverside Condos Phase 2',
        type: ProjectType.MULTIFAMILY,
        division: Division.PLUMBING_MULTIFAMILY,
        status: ProjectStatus.AWARDED,
        contractAmount: 650000.00,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-09-30'),
        crewSize: 3,
        address: '789 Riverside Dr, Burnaby, BC',
        clientName: 'Riverside Developments',
        clientContact: 'Bob Builder (555-9012)',
        notes: '80 unit condo complex',
        createdById: users[2].id, // PM
        modifiedById: users[2].id,
      },
    }),
  ]);

  console.log(`✅ Created ${projects.length} projects`);

  // Create Project Phases
  const phases = await Promise.all([
    // Phases for Project 1
    prisma.projectPhase.create({
      data: {
        projectId: projects[0].id,
        phaseNumber: 1,
        name: 'Underground Rough-In',
        division: Division.PLUMBING_MULTIFAMILY,
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-03-15'),
        actualStartDate: new Date('2024-01-20'),
        duration: 55,
        progressPercentage: 100,
        requiredCrewSize: 5,
        requiredForeman: true,
        requiredJourneymen: 2,
        requiredApprentices: 2,
        laborHours: 2200,
        status: PhaseStatus.COMPLETED,
        dependencies: [],
        updatedBy: users[1].id,
      },
    }),
    prisma.projectPhase.create({
      data: {
        projectId: projects[0].id,
        phaseNumber: 2,
        name: 'Above Ground Rough-In',
        division: Division.PLUMBING_MULTIFAMILY,
        startDate: new Date('2024-03-16'),
        endDate: new Date('2024-06-30'),
        actualStartDate: new Date('2024-03-20'),
        duration: 106,
        progressPercentage: 75,
        requiredCrewSize: 4,
        requiredForeman: true,
        requiredJourneymen: 2,
        requiredApprentices: 1,
        laborHours: 4240,
        status: PhaseStatus.IN_PROGRESS,
        dependencies: [],
        updatedBy: users[1].id,
      },
    }),
    prisma.projectPhase.create({
      data: {
        projectId: projects[0].id,
        phaseNumber: 3,
        name: 'Finishing',
        division: Division.PLUMBING_MULTIFAMILY,
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-09-30'),
        duration: 91,
        progressPercentage: 0,
        requiredCrewSize: 3,
        requiredForeman: true,
        requiredJourneymen: 1,
        requiredApprentices: 1,
        laborHours: 2730,
        status: PhaseStatus.NOT_STARTED,
        dependencies: [],
        updatedBy: users[1].id,
      },
    }),
    // Phases for Project 2
    prisma.projectPhase.create({
      data: {
        projectId: projects[1].id,
        phaseNumber: 1,
        name: 'Demolition & Removal',
        division: Division.HVAC_COMMERCIAL,
        startDate: new Date('2024-02-05'),
        endDate: new Date('2024-02-28'),
        actualStartDate: new Date('2024-02-05'),
        duration: 23,
        progressPercentage: 100,
        requiredCrewSize: 3,
        requiredForeman: true,
        requiredJourneymen: 1,
        requiredApprentices: 1,
        laborHours: 690,
        status: PhaseStatus.COMPLETED,
        dependencies: [],
        updatedBy: users[1].id,
      },
    }),
    prisma.projectPhase.create({
      data: {
        projectId: projects[1].id,
        phaseNumber: 2,
        name: 'Equipment Installation',
        division: Division.HVAC_COMMERCIAL,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-07-31'),
        actualStartDate: new Date('2024-03-01'),
        duration: 152,
        progressPercentage: 60,
        requiredCrewSize: 4,
        requiredForeman: true,
        requiredJourneymen: 2,
        requiredApprentices: 1,
        laborHours: 6080,
        status: PhaseStatus.IN_PROGRESS,
        dependencies: [],
        updatedBy: users[1].id,
      },
    }),
  ]);

  console.log(`✅ Created ${phases.length} project phases`);

  // Create Crew Assignments
  const assignments = await Promise.all([
    prisma.crewAssignment.create({
      data: {
        phaseId: phases[1].id, // Above Ground Rough-In
        employeeId: employees[0].id, // Tom Wilson (Foreman)
        assignmentDate: new Date('2024-03-20'),
        hoursAllocated: 40,
        actualHoursWorked: 38,
        role: EmployeeType.FOREMAN,
        isLead: true,
        createdBy: users[1].id,
      },
    }),
    prisma.crewAssignment.create({
      data: {
        phaseId: phases[1].id,
        employeeId: employees[2].id, // David Smith (Journeyman)
        assignmentDate: new Date('2024-03-20'),
        hoursAllocated: 40,
        actualHoursWorked: 40,
        role: EmployeeType.JOURNEYMAN,
        isLead: false,
        createdBy: users[1].id,
      },
    }),
    prisma.crewAssignment.create({
      data: {
        phaseId: phases[4].id, // Equipment Installation
        employeeId: employees[1].id, // James Brown (Foreman)
        assignmentDate: new Date('2024-03-01'),
        hoursAllocated: 40,
        role: EmployeeType.FOREMAN,
        isLead: true,
        createdBy: users[1].id,
      },
    }),
  ]);

  console.log(`✅ Created ${assignments.length} crew assignments`);

  // Create Schedule of Values
  const sovItems = await Promise.all([
    prisma.scheduleOfValues.create({
      data: {
        projectId: projects[0].id,
        lineNumber: 1,
        description: 'Mobilization & Site Setup',
        value: 42500.00,
        billingPercentage: 100,
        billingDate: new Date('2024-02-01'),
        actualBillingDate: new Date('2024-02-05'),
        invoiceNumber: 'INV-2024-001',
        status: 'PAID',
      },
    }),
    prisma.scheduleOfValues.create({
      data: {
        projectId: projects[0].id,
        lineNumber: 2,
        description: 'Underground Rough-In',
        value: 255000.00,
        billingPercentage: 100,
        billingDate: new Date('2024-04-01'),
        actualBillingDate: new Date('2024-04-03'),
        invoiceNumber: 'INV-2024-002',
        status: 'PAID',
      },
    }),
    prisma.scheduleOfValues.create({
      data: {
        projectId: projects[0].id,
        lineNumber: 3,
        description: 'Above Ground Rough-In',
        value: 340000.00,
        billingPercentage: 75,
        billingDate: new Date('2024-07-01'),
        status: 'INVOICED',
      },
    }),
  ]);

  console.log(`✅ Created ${sovItems.length} schedule of values items`);

  // Create Capacity Snapshot
  const capacitySnapshot = await prisma.capacitySnapshot.create({
    data: {
      date: new Date(),
      division: Division.PLUMBING_MULTIFAMILY,
      totalEmployees: 6,
      availableHours: 240,
      scheduledHours: 180,
      utilizationPercentage: 75,
      foremanCount: 1,
      journeymanCount: 2,
      apprenticeCount: 1,
      projectCount: 2,
      criticalProjects: [projects[0].id],
    },
  });

  console.log('✅ Created capacity snapshot');

  // Create Labor Forecast
  const laborForecast = await prisma.laborForecast.create({
    data: {
      division: Division.PLUMBING_MULTIFAMILY,
      forecastDate: new Date(),
      weekStarting: new Date('2024-10-28'),
      requiredHours: 320,
      availableHours: 240,
      deficit: 80,
      requiredForemen: 2,
      requiredJourneymen: 4,
      requiredApprentices: 2,
      recommendations: [
        'Consider hiring 1 additional journeyman',
        'Schedule overtime for critical path activities',
      ],
      confidence: 85,
    },
  });

  console.log('✅ Created labor forecast');

  // Create Alerts
  const alerts = await Promise.all([
    prisma.alert.create({
      data: {
        type: AlertType.CAPACITY_WARNING,
        severity: AlertSeverity.HIGH,
        title: 'High Capacity Utilization',
        message: 'Plumbing Multifamily division is at 90% capacity for next week',
        projectId: projects[0].id,
        triggerValue: 90,
        threshold: 80,
        userId: users[1].id,
      },
    }),
    prisma.alert.create({
      data: {
        type: AlertType.SCHEDULE_CONFLICT,
        severity: AlertSeverity.MEDIUM,
        title: 'Foreman Double-Booked',
        message: 'Tom Wilson is scheduled for two projects on the same day',
        projectId: projects[0].id,
        userId: users[1].id,
      },
    }),
  ]);

  console.log(`✅ Created ${alerts.length} alerts`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });