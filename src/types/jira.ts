export interface JiraUser {
    id: string;
    name: string;
    avatar?: string;
    displayName?: string; // Sometimes used interchangeably or nested
}

export interface JiraIssue {
    key: string;
    summary: string;
    status: string;
    project: string;
    description?: string;

    // Dates
    created?: string;
    updated?: string;
    duedate?: string;
    parentDeadline?: string;
    latestDeadline?: string; // Calculated
    latestDeadlineObj?: Date;

    // Relations
    assignee?: JiraUser;
    gestor?: JiraUser;
    manager?: JiraUser; // Legacy field name check
    organization?: string;
    parent?: {
        key: string;
        summary: string;
    };

    // Custom Fields (often mapped)
    billingMode?: string;

    // Hito Specifics
    totalHitos: number;
    pendingHitos: number;
    children?: JiraIssue[]; // For Evolutivos that have Hitos
}

export interface DashboardStats {
    expired: number;
    today: number;
    upcoming: number;
    others: number;
    total?: number;
    activeEvolutivos?: number;
}
