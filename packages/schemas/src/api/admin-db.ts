export interface DbColumn {
  name: string;
  type: string;
  isId: boolean;
  isRequired: boolean;
  isList: boolean;
}

export interface DbTableOverview {
  name: string;
  columns: DbColumn[];
  rowCount?: number;
  sample?: Record<string, unknown>[];
}

export interface DbRelationOverview {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

export interface DbOverview {
  tables: DbTableOverview[];
  relations?: DbRelationOverview[];
}
