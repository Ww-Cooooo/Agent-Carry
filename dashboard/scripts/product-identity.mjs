export const PRODUCT_IDENTITY = Object.freeze({
  productId: "ai-carry",
  productName: "AI Carry",
  productVersion: "2.0.0",
  coreId: "ai-carry-core",
  startupCapsuleId: "ai-carry-startup",
  componentRegistryRecordType: "ai-carry-instance-component-registry",
  componentRecordType: "ai-carry-instance-component",
  componentInterface: "ai-carry.instance-component@1",
  professionalExtensionRecordType: "ai-carry-professional-extension",
  snapshotGlobal: "AI_CARRY_SNAPSHOT",
  snapshotRealGlobal: "AI_CARRY_IS_REAL",
  snapshotDemoGlobal: "AI_CARRY_DEMO",
});

export const LEGACY_PRODUCT_IDENTITY = Object.freeze({
  productIds: Object.freeze(["agent-carry"]),
  productNames: Object.freeze(["Agent Carry"]),
  coreIds: Object.freeze(["agent-carry-core"]),
  startupCapsuleIds: Object.freeze(["agent-carry-startup"]),
  componentRegistryRecordTypes: Object.freeze(["agent-carry-instance-component-registry"]),
  componentRecordTypes: Object.freeze(["agent-carry-instance-component"]),
  componentInterfaces: Object.freeze(["agent-carry.instance-component@1"]),
  professionalExtensionRecordTypes: Object.freeze(["agent-carry-professional-extension"]),
  snapshotGlobals: Object.freeze(["AGENT_CARRY_SNAPSHOT", "AGENT_CARRY_IS_REAL", "AGENT_CARRY_DEMO"]),
});

export const acceptedComponentRegistryRecordTypes = Object.freeze(new Set([
  PRODUCT_IDENTITY.componentRegistryRecordType,
  ...LEGACY_PRODUCT_IDENTITY.componentRegistryRecordTypes,
]));
export const acceptedComponentRecordTypes = Object.freeze(new Set([
  PRODUCT_IDENTITY.componentRecordType,
  ...LEGACY_PRODUCT_IDENTITY.componentRecordTypes,
]));
export const acceptedComponentInterfaces = Object.freeze(new Set([
  PRODUCT_IDENTITY.componentInterface,
  ...LEGACY_PRODUCT_IDENTITY.componentInterfaces,
]));
export const acceptedProfessionalExtensionRecordTypes = Object.freeze(new Set([
  PRODUCT_IDENTITY.professionalExtensionRecordType,
  ...LEGACY_PRODUCT_IDENTITY.professionalExtensionRecordTypes,
]));

export function hasAcceptedComponentInterface(values) {
  return Array.isArray(values) && values.some((value) => acceptedComponentInterfaces.has(value));
}
