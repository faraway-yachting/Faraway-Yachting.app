export interface ExternalBoat {
  id: string;
  name: string;
  displayName: string;
  operatorName?: string;
  contactId?: string;
  departFrom?: string;
  pictureUrl?: string;
  contractUrl?: string;
  contractFilename?: string;
  contactPerson?: string;
  contactChannel?: string;
  contactValue?: string;
  isActive: boolean;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
