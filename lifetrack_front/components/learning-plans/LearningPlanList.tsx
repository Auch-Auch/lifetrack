/**
 * LearningPlanList Component
 * 
 * Displays a list of learning plans with filtering
 */

'use client';

import React, { useState, useMemo } from 'react';
import type { LearningPlan } from '../../lib/events';
import { useLearningPlanStore } from '../../stores/learningPlanStore';
import LearningPlanCard from './LearningPlanCard';
import EmptyState from '../ui/EmptyState';
import { BookOpen, Search } from 'lucide-react';

// ============================================================================
// Component Props
// ============================================================================

interface LearningPlanListProps {
  plans?: LearningPlan[]; // If not provided, uses all plans from store
  onEdit?: (plan: LearningPlan) => void;
  onDelete?: (planId: string) => void;
  showFilters?: boolean;
  compact?: boolean;
}

// ============================================================================
// LearningPlanList Component
// ============================================================================

export default function LearningPlanList({
  plans: externalPlans,
  onEdit,
  onDelete,
  showFilters = true,
  compact = false,
}: LearningPlanListProps) {
  const storePlans = useLearningPlanStore((state) => state.plans);
  const plans = externalPlans || storePlans;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');
  
  // Filter plans
  const filteredPlans = useMemo(() => {
    let result = [...plans];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (plan) =>
          plan.name.toLowerCase().includes(query) ||
          plan.description?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    const today = new Date().toISOString().split('T')[0];
    if (filterStatus === 'active') {
      result = result.filter(
        (plan) => plan.startDate <= today && (!plan.endDate || plan.endDate >= today)
      );
    } else if (filterStatus === 'upcoming') {
      result = result.filter((plan) => plan.startDate > today);
    } else if (filterStatus === 'completed') {
      result = result.filter((plan) => plan.endDate && plan.endDate < today);
    }
    
    // Sort by start date (newest first)
    return result.sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [plans, searchQuery, filterStatus]);
  
  const statusOptions = [
    { value: 'all', label: 'All Plans' },
    { value: 'active', label: 'Active' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'completed', label: 'Completed' },
  ] as const;
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search learning plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
            />
          </div>
          
          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="px-4 py-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {/* Results count */}
      {filteredPlans.length > 0 && (
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          {filteredPlans.length} plan{filteredPlans.length !== 1 ? 's' : ''}
        </p>
      )}
      
      {/* Plan List */}
      {filteredPlans.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-12 h-12" />}
          title="No learning plans found"
          description={
            searchQuery || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first learning plan to get started'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredPlans.map((plan) => (
            <LearningPlanCard
              key={plan.id}
              plan={plan}
              onEdit={onEdit}
              onDelete={onDelete}
              compact={compact}
            />
          ))}
        </div>
      )}
    </div>
  );
}
