import { describe, expect, test } from 'vitest';
import {
  BODY_REGION_TO_EQUIPMENT_SLOTS,
  EQUIPMENT_SLOT_TO_BODY_REGIONS,
  doesSlotCoverRegion,
  getBodyRegionsForSlot,
  getEquipmentSlotsForRegion,
  resolveBodyWithEquipment,
  type EquipmentSlot,
} from '../src/index.js';

const slotCases: {
  region: keyof typeof BODY_REGION_TO_EQUIPMENT_SLOTS;
  expected: EquipmentSlot[];
}[] = [
  { region: 'feet', expected: ['feet'] },
  { region: 'neck', expected: ['torso', 'accessory'] },
  { region: 'hands', expected: ['hands'] },
];

describe('equipment resolver', () => {
  test.each(slotCases)(
    'getEquipmentSlotsForRegion(%s) returns expected slots',
    ({ region, expected }) => {
      expect(getEquipmentSlotsForRegion(region)).toEqual(expected);
    }
  );

  const coverageCases: {
    slot: keyof typeof EQUIPMENT_SLOT_TO_BODY_REGIONS;
    region: string;
    expected: boolean;
  }[] = [
    { slot: 'torso', region: 'chest', expected: true },
    { slot: 'feet', region: 'hands', expected: false },
    { slot: 'accessory', region: 'ears', expected: true },
  ];

  test.each(coverageCases)(
    'doesSlotCoverRegion(%s, %s) matches expected coverage',
    ({ slot, region, expected }) => {
      expect(doesSlotCoverRegion(slot, region as keyof typeof BODY_REGION_TO_EQUIPMENT_SLOTS)).toBe(
        expected
      );
    }
  );

  test('getBodyRegionsForSlot returns configured regions', () => {
    expect(getBodyRegionsForSlot('feet')).toContain('toes');
    expect(getBodyRegionsForSlot('torso')).toContain('chest');
  });

  test('resolveBodyWithEquipment falls back to default region when reference is empty', () => {
    const resolved = resolveBodyWithEquipment(undefined, 'torso');
    expect(resolved.region).toBe('torso');
    expect(resolved.equipmentSlots).toEqual(getEquipmentSlotsForRegion('torso'));
  });
});
