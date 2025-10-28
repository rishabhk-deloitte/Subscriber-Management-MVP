"use client";

import { Fragment } from "react";

export type RuleField = "tenureMonths" | "arpuBand" | "planType" | "bundleEligible";
export type RuleOperator = "gte" | "lte" | "eq";

export type BuilderRule = {
  id: string;
  field: RuleField;
  op: RuleOperator;
  value: string | number | boolean;
};

export type BuilderGroup = {
  id: string;
  logic: "AND" | "OR";
  nodes: (BuilderRule | BuilderGroup)[];
};

type RuleBuilderProps = {
  group: BuilderGroup;
  onChange: (group: BuilderGroup) => void;
};

type FieldConfig = {
  label: string;
  operators: RuleOperator[];
  values: (string | number | boolean)[];
};

const FIELD_CONFIG: Record<RuleField, FieldConfig> = {
  tenureMonths: {
    label: "Tenure (months)",
    operators: ["gte", "lte"],
    values: [3, 6, 12, 18, 24, 36],
  },
  arpuBand: {
    label: "ARPU band",
    operators: ["eq"],
    values: ["Low", "Mid", "High"],
  },
  planType: {
    label: "Plan type",
    operators: ["eq"],
    values: ["prepaid", "postpaid", "bundle"],
  },
  bundleEligible: {
    label: "Bundle eligible",
    operators: ["eq"],
    values: [true, false],
  },
};

const OPERAND_LABELS: Record<RuleOperator, string> = {
  gte: "≥",
  lte: "≤",
  eq: "=",
};

const isGroup = (node: BuilderRule | BuilderGroup): node is BuilderGroup => (node as BuilderGroup).nodes !== undefined;

const createRule = (field: RuleField): BuilderRule => {
  const config = FIELD_CONFIG[field];
  return {
    id: crypto.randomUUID(),
    field,
    op: config.operators[0],
    value: config.values[0],
  };
};

const updateNode = (
  group: BuilderGroup,
  nodeId: string,
  updater: (node: BuilderRule | BuilderGroup) => BuilderRule | BuilderGroup,
): BuilderGroup => {
  return {
    ...group,
    nodes: group.nodes.map((node) => {
      if (isGroup(node)) {
        if (node.id === nodeId) {
          return updater(node) as BuilderGroup;
        }
        return updateNode(node, nodeId, updater);
      }
      if (node.id === nodeId) {
        return updater(node);
      }
      return node;
    }),
  };
};

const removeNode = (group: BuilderGroup, nodeId: string): BuilderGroup => {
  return {
    ...group,
    nodes: group.nodes
      .map((node) => {
        if (isGroup(node)) {
          if (node.id === nodeId) return undefined;
          return removeNode(node, nodeId);
        }
        if (node.id === nodeId) return undefined;
        return node;
      })
      .filter(Boolean) as (BuilderRule | BuilderGroup)[],
  };
};

const appendToGroup = (group: BuilderGroup, targetId: string, node: BuilderRule | BuilderGroup): BuilderGroup => {
  if (group.id === targetId) {
    return {
      ...group,
      nodes: [...group.nodes, node],
    };
  }
  return {
    ...group,
    nodes: group.nodes.map((child) => (isGroup(child) ? appendToGroup(child, targetId, node) : child)),
  };
};

const RuleChip = ({ rule, onChange, onRemove }: { rule: BuilderRule; onChange: (rule: BuilderRule) => void; onRemove: () => void }) => {
  const config = FIELD_CONFIG[rule.field];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
      <select
        value={rule.field}
        onChange={(event) => {
          const nextField = event.target.value as RuleField;
          const template = createRule(nextField);
          onChange({ ...template, id: rule.id });
        }}
        className="rounded-md border border-slate-200 px-2 py-1"
      >
        {Object.entries(FIELD_CONFIG).map(([key, value]) => (
          <option key={key} value={key}>
            {value.label}
          </option>
        ))}
      </select>
      <select
        value={rule.op}
        onChange={(event) => onChange({ ...rule, op: event.target.value as RuleOperator })}
        className="rounded-md border border-slate-200 px-2 py-1"
      >
        {config.operators.map((operator) => (
          <option key={operator} value={operator}>
            {OPERAND_LABELS[operator]}
          </option>
        ))}
      </select>
      <select
        value={String(rule.value)}
        onChange={(event) => {
          const raw = event.target.value;
          let parsed: string | number | boolean = raw;
          if (typeof rule.value === "number") {
            parsed = Number(raw);
          } else if (typeof rule.value === "boolean") {
            parsed = raw === "true";
          }
          onChange({ ...rule, value: parsed });
        }}
        className="rounded-md border border-slate-200 px-2 py-1"
      >
        {config.values.map((value) => (
          <option key={String(value)} value={String(value)}>
            {String(value)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-md border border-slate-200 px-2 py-1 text-slate-500 hover:border-rose-300 hover:text-rose-600"
      >
        Remove
      </button>
    </div>
  );
};

const GroupEditor = ({ group, onGroupChange }: { group: BuilderGroup; onGroupChange: (group: BuilderGroup) => void }) => {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Logic</span>
          <select
            value={group.logic}
            onChange={(event) => onGroupChange({ ...group, logic: event.target.value as BuilderGroup["logic"] })}
            className="rounded-md border border-slate-200 px-2 py-1 text-xs"
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onGroupChange(appendToGroup(group, group.id, createRule("tenureMonths")))}
            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"
          >
            Add rule
          </button>
          <button
            type="button"
            onClick={() =>
              onGroupChange(
                appendToGroup(group, group.id, {
                  id: crypto.randomUUID(),
                  logic: "AND",
                  nodes: [createRule("planType")],
                }),
              )
            }
            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:border-brand-300 hover:text-brand-600"
          >
            Add subgroup
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {group.nodes.map((node) => (
          <Fragment key={node.id}>
            {isGroup(node) ? (
              <GroupEditor
                group={node}
                onGroupChange={(nextGroup) => onGroupChange(updateNode(group, node.id, () => nextGroup))}
              />
            ) : (
              <RuleChip
                rule={node}
                onChange={(nextRule) => onGroupChange(updateNode(group, node.id, () => nextRule))}
                onRemove={() => onGroupChange(removeNode(group, node.id))}
              />
            )}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export const RuleBuilder = ({ group, onChange }: RuleBuilderProps) => {
  return <GroupEditor group={group} onGroupChange={onChange} />;
};
