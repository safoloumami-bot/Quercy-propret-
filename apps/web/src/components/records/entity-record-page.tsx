"use client";

import type { EntityKey, FieldDef } from "@quercy/core";

import { RecordView } from "./record-view";
import type { EntityPermissions } from "./types";

export function EntityRecordPage(props: {
  entity: EntityKey;
  id: string;
  fields: FieldDef[];
  permissions: EntityPermissions;
  meId: string;
  initialTab?: string;
}) {
  return <RecordView {...props} mode="page" />;
}
