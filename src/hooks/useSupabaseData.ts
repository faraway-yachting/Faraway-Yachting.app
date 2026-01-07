"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  companiesApi,
  contactsApi,
  projectsApi,
  bankAccountsApi
} from '@/lib/supabase/api';
import {
  dbCompanyToFrontend,
  dbContactToFrontend,
  dbProjectToFrontend,
} from '@/lib/supabase/transforms';
import type { Company } from '@/data/company/types';
import type { Contact } from '@/data/contact/types';
import type { Project } from '@/data/project/types';
import type { Database } from '@/lib/supabase/database.types';

type BankAccount = Database['public']['Tables']['bank_accounts']['Row'];

interface UseDataResult<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Generic hook factory with optional transform
function createUseDataHook<TDb, TFrontend = TDb>(
  fetchFn: () => Promise<TDb[]>,
  transform?: (db: TDb) => TFrontend
): () => UseDataResult<TFrontend> {
  return function useData(): UseDataResult<TFrontend> {
    const [data, setData] = useState<TFrontend[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refetch = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchFn();
        const transformed = transform
          ? result.map(transform)
          : result as unknown as TFrontend[];
        setData(transformed);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch data'));
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      refetch();
    }, [refetch]);

    return { data, loading, error, refetch };
  };
}

type DbCompany = Database['public']['Tables']['companies']['Row'];
type DbContact = Database['public']['Tables']['contacts']['Row'];
type DbProject = Database['public']['Tables']['projects']['Row'];

// Companies hooks - transformed to frontend format
export const useCompanies = createUseDataHook<DbCompany, Company>(
  () => companiesApi.getAll(),
  dbCompanyToFrontend
);
export const useActiveCompanies = createUseDataHook<DbCompany, Company>(
  () => companiesApi.getActive(),
  dbCompanyToFrontend
);

// Contacts hooks - transformed to frontend format
export const useContacts = createUseDataHook<DbContact, Contact>(
  () => contactsApi.getAll(),
  dbContactToFrontend
);
export const useActiveContacts = createUseDataHook<DbContact, Contact>(
  () => contactsApi.getActive(),
  dbContactToFrontend
);
export const useCustomers = createUseDataHook<DbContact, Contact>(
  () => contactsApi.getCustomers(),
  dbContactToFrontend
);
export const useVendors = createUseDataHook<DbContact, Contact>(
  () => contactsApi.getVendors(),
  dbContactToFrontend
);

// Projects hooks - transformed to frontend format
export const useProjects = createUseDataHook<DbProject, Project>(
  () => projectsApi.getAll(),
  dbProjectToFrontend
);
export const useActiveProjects = createUseDataHook<DbProject, Project>(
  () => projectsApi.getActive(),
  dbProjectToFrontend
);

// Bank accounts hooks - no transform needed (used as-is or transformed in components)
export const useBankAccounts = createUseDataHook<BankAccount>(
  () => bankAccountsApi.getAll()
);
export const useActiveBankAccounts = createUseDataHook<BankAccount>(
  () => bankAccountsApi.getActive()
);

// Hook for fetching a single company by ID
export function useCompany(id: string | null) {
  const [data, setData] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    companiesApi.getById(id)
      .then(dbCompany => setData(dbCompany ? dbCompanyToFrontend(dbCompany) : null))
      .catch(e => setError(e instanceof Error ? e : new Error('Failed to fetch company')))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

export function useContact(id: string | null) {
  const [data, setData] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    contactsApi.getById(id)
      .then(dbContact => setData(dbContact ? dbContactToFrontend(dbContact) : null))
      .catch(e => setError(e instanceof Error ? e : new Error('Failed to fetch contact')))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

export function useProject(id: string | null) {
  const [data, setData] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    projectsApi.getById(id)
      .then(dbProject => setData(dbProject ? dbProjectToFrontend(dbProject) : null))
      .catch(e => setError(e instanceof Error ? e : new Error('Failed to fetch project')))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

export function useBankAccount(id: string | null) {
  const [data, setData] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    bankAccountsApi.getById(id)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e : new Error('Failed to fetch bank account')))
      .finally(() => setLoading(false));
  }, [id]);

  return { data, loading, error };
}

// Combined hook for form dropdowns - returns transformed data
export function useFormDropdownData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<{
    companies: Company[];
    customers: Contact[];
    vendors: Contact[];
    projects: Project[];
    bankAccounts: BankAccount[];
  }>({
    companies: [],
    customers: [],
    vendors: [],
    projects: [],
    bankAccounts: [],
  });

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dbCompanies, dbCustomers, dbVendors, dbProjects, bankAccounts] = await Promise.all([
        companiesApi.getActive(),
        contactsApi.getCustomers(),
        contactsApi.getVendors(),
        projectsApi.getActive(),
        bankAccountsApi.getActive(),
      ]);
      setData({
        companies: dbCompanies.map(dbCompanyToFrontend),
        customers: dbCustomers.map(dbContactToFrontend),
        vendors: dbVendors.map(dbContactToFrontend),
        projects: dbProjects.map(dbProjectToFrontend),
        bankAccounts,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to fetch dropdown data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...data, loading, error, refetch };
}
