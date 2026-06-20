import {
  Department,
  Designation,
  MilestoneStatus,
  ProjectStatus,
  ProficiencyLevel,
  ResourceStatus,
  SkillCategory,
} from '@prisma/client';

export const SEED_PASSWORDS = {
  manager: 'Manager@1234',
  resource: 'Resource@1234',
} as const;

export interface SeedSkillDef {
  name: string;
  category: SkillCategory;
  proficiency: ProficiencyLevel;
}

export interface SeedResourceDef {
  username: string;
  email: string;
  fullName: string;
  department: Department;
  designation: Designation;
  managerUsername: string;
  resourceStatus: ResourceStatus;
  skills: SeedSkillDef[];
}

export interface SeedMilestoneDef {
  title: string;
  dueDateOffsetDays: number;
  status: MilestoneStatus;
  storyPoints: number;
  sortOrder: number;
}

export interface SeedProjectDef {
  name: string;
  description: string;
  managerUsername: string;
  startDateOffsetDays: number;
  endDateOffsetDays: number;
  status: ProjectStatus;
  totalStoryPoints: number;
  milestones: SeedMilestoneDef[];
}

export interface SeedAllocationDef {
  resourceUsername: string;
  projectName: string;
  utilizationPercent: number;
  fromDateOffsetDays: number;
  toDateOffsetDays: number;
}

export interface SeedTimesheetDef {
  resourceUsername: string;
  weekOffset: number;
  entries: Array<{
    projectName: string;
    hours: number;
    tagNames: string[];
  }>;
}

export const SEED_MANAGERS = [
  {
    username: 'ankit.shah',
    email: 'ankit.shah@techserve.local',
    fullName: 'Ankit Shah',
    department: Department.ENGINEERING,
    designation: Designation.PROJECT_MANAGER,
  },
  {
    username: 'neha.gupta',
    email: 'neha.gupta@techserve.local',
    fullName: 'Neha Gupta',
    department: Department.QUALITY_ASSURANCE,
    designation: Designation.PROJECT_MANAGER,
  },
  {
    username: 'vikram.singh',
    email: 'vikram.singh@techserve.local',
    fullName: 'Vikram Singh',
    department: Department.DEVOPS,
    designation: Designation.PROJECT_MANAGER,
  },
] as const;

export const SEED_RESOURCES: SeedResourceDef[] = [
  {
    username: 'ravi.kumar',
    email: 'ravi.kumar@techserve.local',
    fullName: 'Ravi Kumar',
    department: Department.ENGINEERING,
    designation: Designation.SOFTWARE_ENGINEER,
    managerUsername: 'ankit.shah',
    resourceStatus: ResourceStatus.ALLOCATED,
    skills: [
      { name: 'Java', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Spring Boot', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'PostgreSQL', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'priya.sharma',
    email: 'priya.sharma@techserve.local',
    fullName: 'Priya Sharma',
    department: Department.ENGINEERING,
    designation: Designation.SOFTWARE_ENGINEER,
    managerUsername: 'ankit.shah',
    resourceStatus: ResourceStatus.BENCH,
    skills: [
      { name: 'React', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'TypeScript', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Next.js', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'sneha.iyer',
    email: 'sneha.iyer@techserve.local',
    fullName: 'Sneha Iyer',
    department: Department.ENGINEERING,
    designation: Designation.SENIOR_SOFTWARE_ENGINEER,
    managerUsername: 'ankit.shah',
    resourceStatus: ResourceStatus.ALLOCATED,
    skills: [
      { name: 'Angular', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'RxJS', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.INTERMEDIATE },
      { name: 'Java', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'karthik.menon',
    email: 'karthik.menon@techserve.local',
    fullName: 'Karthik Menon',
    department: Department.ENGINEERING,
    designation: Designation.SOFTWARE_ENGINEER,
    managerUsername: 'ankit.shah',
    resourceStatus: ResourceStatus.BENCH,
    skills: [
      { name: 'Python', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Django', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
      { name: 'FastAPI', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'divya.nair',
    email: 'divya.nair@techserve.local',
    fullName: 'Divya Nair',
    department: Department.ENGINEERING,
    designation: Designation.SENIOR_SOFTWARE_ENGINEER,
    managerUsername: 'ankit.shah',
    resourceStatus: ResourceStatus.ALLOCATED,
    skills: [
      { name: 'React', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Node.js', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'GraphQL', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'arjun.verma',
    email: 'arjun.verma@techserve.local',
    fullName: 'Arjun Verma',
    department: Department.ENGINEERING,
    designation: Designation.SOFTWARE_ENGINEER,
    managerUsername: 'ankit.shah',
    resourceStatus: ResourceStatus.BENCH,
    skills: [
      { name: 'Node.js', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
      { name: 'Express', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
      { name: 'MongoDB', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.BEGINNER },
    ],
  },
  {
    username: 'kavya.reddy',
    email: 'kavya.reddy@techserve.local',
    fullName: 'Kavya Reddy',
    department: Department.ENGINEERING,
    designation: Designation.SOFTWARE_ENGINEER,
    managerUsername: 'ankit.shah',
    resourceStatus: ResourceStatus.ALLOCATED,
    skills: [
      { name: 'Java', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
      { name: 'Kafka', category: SkillCategory.BACKEND, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'lakshmi.rao',
    email: 'lakshmi.rao@techserve.local',
    fullName: 'Lakshmi Rao',
    department: Department.PRODUCT,
    designation: Designation.BUSINESS_ANALYST,
    managerUsername: 'ankit.shah',
    resourceStatus: ResourceStatus.BENCH,
    skills: [
      { name: 'Requirements Analysis', category: SkillCategory.OTHER, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'JIRA', category: SkillCategory.OTHER, proficiency: ProficiencyLevel.ADVANCED },
    ],
  },
  {
    username: 'amit.patel',
    email: 'amit.patel@techserve.local',
    fullName: 'Amit Patel',
    department: Department.ENGINEERING,
    designation: Designation.SOFTWARE_ENGINEER,
    managerUsername: 'neha.gupta',
    resourceStatus: ResourceStatus.ALLOCATED,
    skills: [
      { name: 'React Native', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'iOS', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.INTERMEDIATE },
      { name: 'Android', category: SkillCategory.FRONTEND, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'meera.joshi',
    email: 'meera.joshi@techserve.local',
    fullName: 'Meera Joshi',
    department: Department.QUALITY_ASSURANCE,
    designation: Designation.QA_ENGINEER,
    managerUsername: 'neha.gupta',
    resourceStatus: ResourceStatus.ALLOCATED,
    skills: [
      { name: 'Selenium', category: SkillCategory.QA, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Cypress', category: SkillCategory.QA, proficiency: ProficiencyLevel.INTERMEDIATE },
      { name: 'API Testing', category: SkillCategory.QA, proficiency: ProficiencyLevel.ADVANCED },
    ],
  },
  {
    username: 'pooja.desai',
    email: 'pooja.desai@techserve.local',
    fullName: 'Pooja Desai',
    department: Department.QUALITY_ASSURANCE,
    designation: Designation.QA_ENGINEER,
    managerUsername: 'neha.gupta',
    resourceStatus: ResourceStatus.BENCH,
    skills: [
      { name: 'Manual Testing', category: SkillCategory.QA, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Test Planning', category: SkillCategory.QA, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'rohan.desai',
    email: 'rohan.desai@techserve.local',
    fullName: 'Rohan Desai',
    department: Department.DEVOPS,
    designation: Designation.DEVOPS_ENGINEER,
    managerUsername: 'vikram.singh',
    resourceStatus: ResourceStatus.ALLOCATED,
    skills: [
      { name: 'AWS', category: SkillCategory.DEVOPS, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Kubernetes', category: SkillCategory.DEVOPS, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Terraform', category: SkillCategory.DEVOPS, proficiency: ProficiencyLevel.INTERMEDIATE },
    ],
  },
  {
    username: 'sanjay.malhotra',
    email: 'sanjay.malhotra@techserve.local',
    fullName: 'Sanjay Malhotra',
    department: Department.DEVOPS,
    designation: Designation.DEVOPS_ENGINEER,
    managerUsername: 'vikram.singh',
    resourceStatus: ResourceStatus.ALLOCATED,
    skills: [
      { name: 'Docker', category: SkillCategory.DEVOPS, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'CI/CD', category: SkillCategory.DEVOPS, proficiency: ProficiencyLevel.ADVANCED },
      { name: 'Linux', category: SkillCategory.DEVOPS, proficiency: ProficiencyLevel.ADVANCED },
    ],
  },
  {
    username: 'anita.kulkarni',
    email: 'anita.kulkarni@techserve.local',
    fullName: 'Anita Kulkarni',
    department: Department.DEVOPS,
    designation: Designation.DEVOPS_ENGINEER,
    managerUsername: 'vikram.singh',
    resourceStatus: ResourceStatus.BENCH,
    skills: [
      { name: 'Azure', category: SkillCategory.DEVOPS, proficiency: ProficiencyLevel.INTERMEDIATE },
      { name: 'Ansible', category: SkillCategory.DEVOPS, proficiency: ProficiencyLevel.BEGINNER },
    ],
  },
];

export const SEED_PROJECTS: SeedProjectDef[] = [
  {
    name: 'Alpha Portal',
    description: 'Customer portal redesign with React and Spring Boot microservices',
    managerUsername: 'ankit.shah',
    startDateOffsetDays: -90,
    endDateOffsetDays: 120,
    status: ProjectStatus.ACTIVE,
    totalStoryPoints: 120,
    milestones: [
      { title: 'Design Complete', dueDateOffsetDays: -60, status: MilestoneStatus.DONE, storyPoints: 20, sortOrder: 1 },
      { title: 'Backend API', dueDateOffsetDays: -14, status: MilestoneStatus.IN_PROGRESS, storyPoints: 50, sortOrder: 2 },
      { title: 'Frontend MVP', dueDateOffsetDays: 14, status: MilestoneStatus.NOT_STARTED, storyPoints: 30, sortOrder: 3 },
      { title: 'Go Live', dueDateOffsetDays: 90, status: MilestoneStatus.NOT_STARTED, storyPoints: 20, sortOrder: 4 },
    ],
  },
  {
    name: 'Beta Mobile App',
    description: 'Cross-platform mobile app for field sales teams',
    managerUsername: 'neha.gupta',
    startDateOffsetDays: -45,
    endDateOffsetDays: 150,
    status: ProjectStatus.ACTIVE,
    totalStoryPoints: 100,
    milestones: [
      { title: 'UX Prototype', dueDateOffsetDays: -30, status: MilestoneStatus.DONE, storyPoints: 15, sortOrder: 1 },
      { title: 'MVP Build', dueDateOffsetDays: 21, status: MilestoneStatus.IN_PROGRESS, storyPoints: 55, sortOrder: 2 },
      { title: 'Store Release', dueDateOffsetDays: 120, status: MilestoneStatus.NOT_STARTED, storyPoints: 30, sortOrder: 3 },
    ],
  },
  {
    name: 'Gamma Data Platform',
    description: 'Analytics lakehouse and reporting APIs',
    managerUsername: 'ankit.shah',
    startDateOffsetDays: -60,
    endDateOffsetDays: 180,
    status: ProjectStatus.ACTIVE,
    totalStoryPoints: 150,
    milestones: [
      { title: 'Data Ingestion', dueDateOffsetDays: -21, status: MilestoneStatus.DONE, storyPoints: 40, sortOrder: 1 },
      { title: 'ETL Pipelines', dueDateOffsetDays: -7, status: MilestoneStatus.IN_PROGRESS, storyPoints: 50, sortOrder: 2 },
      { title: 'Dashboards', dueDateOffsetDays: 45, status: MilestoneStatus.NOT_STARTED, storyPoints: 40, sortOrder: 3 },
      { title: 'Production Cutover', dueDateOffsetDays: 150, status: MilestoneStatus.NOT_STARTED, storyPoints: 20, sortOrder: 4 },
    ],
  },
  {
    name: 'Delta Infrastructure',
    description: 'Kubernetes migration and observability stack',
    managerUsername: 'vikram.singh',
    startDateOffsetDays: -30,
    endDateOffsetDays: 90,
    status: ProjectStatus.ACTIVE,
    totalStoryPoints: 80,
    milestones: [
      { title: 'Cluster Setup', dueDateOffsetDays: -10, status: MilestoneStatus.DONE, storyPoints: 25, sortOrder: 1 },
      { title: 'Workload Migration', dueDateOffsetDays: 30, status: MilestoneStatus.IN_PROGRESS, storyPoints: 35, sortOrder: 2 },
      { title: 'Monitoring Rollout', dueDateOffsetDays: 75, status: MilestoneStatus.NOT_STARTED, storyPoints: 20, sortOrder: 3 },
    ],
  },
  {
    name: 'Epsilon Legacy Migration',
    description: 'Mainframe to cloud migration — currently on hold pending budget',
    managerUsername: 'ankit.shah',
    startDateOffsetDays: -120,
    endDateOffsetDays: 60,
    status: ProjectStatus.ON_HOLD,
    totalStoryPoints: 200,
    milestones: [
      { title: 'Assessment', dueDateOffsetDays: -90, status: MilestoneStatus.DONE, storyPoints: 40, sortOrder: 1 },
      { title: 'Wave 1 Migration', dueDateOffsetDays: -7, status: MilestoneStatus.NOT_STARTED, storyPoints: 80, sortOrder: 2 },
    ],
  },
  {
    name: 'Zeta HR Portal',
    description: 'Internal HR self-service portal — delivered last quarter',
    managerUsername: 'neha.gupta',
    startDateOffsetDays: -200,
    endDateOffsetDays: -30,
    status: ProjectStatus.COMPLETED,
    totalStoryPoints: 90,
    milestones: [
      { title: 'Requirements', dueDateOffsetDays: -180, status: MilestoneStatus.DONE, storyPoints: 15, sortOrder: 1 },
      { title: 'Development', dueDateOffsetDays: -90, status: MilestoneStatus.DONE, storyPoints: 50, sortOrder: 2 },
      { title: 'UAT Sign-off', dueDateOffsetDays: -45, status: MilestoneStatus.DONE, storyPoints: 25, sortOrder: 3 },
    ],
  },
  {
    name: 'Omega Greenfield',
    description: 'Planned greenfield product — not yet kicked off',
    managerUsername: 'ankit.shah',
    startDateOffsetDays: 30,
    endDateOffsetDays: 240,
    status: ProjectStatus.PLANNED,
    totalStoryPoints: 0,
    milestones: [
      { title: 'Discovery', dueDateOffsetDays: 60, status: MilestoneStatus.NOT_STARTED, storyPoints: 20, sortOrder: 1 },
    ],
  },
];

export const SEED_ALLOCATIONS: SeedAllocationDef[] = [
  { resourceUsername: 'ravi.kumar', projectName: 'Alpha Portal', utilizationPercent: 50, fromDateOffsetDays: -90, toDateOffsetDays: 120 },
  { resourceUsername: 'sneha.iyer', projectName: 'Alpha Portal', utilizationPercent: 100, fromDateOffsetDays: -60, toDateOffsetDays: 120 },
  { resourceUsername: 'divya.nair', projectName: 'Alpha Portal', utilizationPercent: 40, fromDateOffsetDays: -45, toDateOffsetDays: 120 },
  { resourceUsername: 'divya.nair', projectName: 'Gamma Data Platform', utilizationPercent: 30, fromDateOffsetDays: -45, toDateOffsetDays: 180 },
  { resourceUsername: 'kavya.reddy', projectName: 'Epsilon Legacy Migration', utilizationPercent: 25, fromDateOffsetDays: -120, toDateOffsetDays: 60 },
  { resourceUsername: 'amit.patel', projectName: 'Beta Mobile App', utilizationPercent: 75, fromDateOffsetDays: -45, toDateOffsetDays: 150 },
  { resourceUsername: 'meera.joshi', projectName: 'Beta Mobile App', utilizationPercent: 50, fromDateOffsetDays: -30, toDateOffsetDays: 150 },
  { resourceUsername: 'rohan.desai', projectName: 'Delta Infrastructure', utilizationPercent: 60, fromDateOffsetDays: -30, toDateOffsetDays: 90 },
  { resourceUsername: 'sanjay.malhotra', projectName: 'Gamma Data Platform', utilizationPercent: 80, fromDateOffsetDays: -40, toDateOffsetDays: 180 },
  { resourceUsername: 'sanjay.malhotra', projectName: 'Delta Infrastructure', utilizationPercent: 20, fromDateOffsetDays: -20, toDateOffsetDays: 90 },
];

/** weekOffset: -1 = prior completed week, -2 = two weeks ago, etc. */
export const SEED_TIMESHEETS: SeedTimesheetDef[] = [
  {
    resourceUsername: 'ravi.kumar',
    weekOffset: -1,
    entries: [{ projectName: 'Alpha Portal', hours: 20, tagNames: ['Backend API Development', 'Microservices / Architecture'] }],
  },
  {
    resourceUsername: 'ravi.kumar',
    weekOffset: -2,
    entries: [{ projectName: 'Alpha Portal', hours: 22, tagNames: ['Backend API Development', 'Code Review / Mentoring'] }],
  },
  {
    resourceUsername: 'ravi.kumar',
    weekOffset: -3,
    entries: [{ projectName: 'Alpha Portal', hours: 18, tagNames: ['Backend API Development', 'Bug Fixing'] }],
  },
  {
    resourceUsername: 'divya.nair',
    weekOffset: -1,
    entries: [
      { projectName: 'Alpha Portal', hours: 12, tagNames: ['Frontend Development'] },
      { projectName: 'Gamma Data Platform', hours: 8, tagNames: ['Backend API Development'] },
    ],
  },
  {
    resourceUsername: 'divya.nair',
    weekOffset: -2,
    entries: [
      { projectName: 'Alpha Portal', hours: 10, tagNames: ['Frontend Development'] },
      { projectName: 'Gamma Data Platform', hours: 6, tagNames: ['Database Design & Queries'] },
    ],
  },
  {
    resourceUsername: 'amit.patel',
    weekOffset: -1,
    entries: [{ projectName: 'Beta Mobile App', hours: 28, tagNames: ['Frontend Development', 'Testing & QA'] }],
  },
  {
    resourceUsername: 'amit.patel',
    weekOffset: -2,
    entries: [{ projectName: 'Beta Mobile App', hours: 30, tagNames: ['Frontend Development'] }],
  },
  {
    resourceUsername: 'meera.joshi',
    weekOffset: -1,
    entries: [{ projectName: 'Beta Mobile App', hours: 16, tagNames: ['Testing & QA'] }],
  },
  {
    resourceUsername: 'rohan.desai',
    weekOffset: -1,
    entries: [{ projectName: 'Delta Infrastructure', hours: 24, tagNames: ['DevOps / Deployment'] }],
  },
  {
    resourceUsername: 'rohan.desai',
    weekOffset: -2,
    entries: [{ projectName: 'Delta Infrastructure', hours: 20, tagNames: ['DevOps / Deployment', 'Documentation'] }],
  },
  {
    resourceUsername: 'sanjay.malhotra',
    weekOffset: -2,
    entries: [{ projectName: 'Gamma Data Platform', hours: 32, tagNames: ['DevOps / Deployment', 'Microservices / Architecture'] }],
  },
];
