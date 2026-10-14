import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLATFORM_CONFIG, normalizePlatformConfig, isSitePaused, resolveFeaturePause, type PlatformConfig } from '../src/utils/platformConfig.ts';

test('DEFAULT_PLATFORM_CONFIG has expected operational defaults', () => {
  assert.equal(DEFAULT_PLATFORM_CONFIG.groupsEnabled, true);
  assert.equal(DEFAULT_PLATFORM_CONFIG.rankingsEnabled, true);
  assert.equal(DEFAULT_PLATFORM_CONFIG.supportEnabled, true);
  assert.equal(DEFAULT_PLATFORM_CONFIG.syllabusEnabled, false);
  assert.equal(DEFAULT_PLATFORM_CONFIG.maintenanceMode, false);
  assert.equal(DEFAULT_PLATFORM_CONFIG.notice, '');
  assert.equal(DEFAULT_PLATFORM_CONFIG.noticeType, 'info');
});

test('PlatformConfig backward compatibility preserves fallback values on partial payloads', () => {
  const legacyPayload = {
    groupsEnabled: false,
    rankingsEnabled: true,
    supportEnabled: true,
    notice: 'Routine update',
  };

  const resolved: PlatformConfig = {
    ...DEFAULT_PLATFORM_CONFIG,
    groupsEnabled: legacyPayload.groupsEnabled ?? DEFAULT_PLATFORM_CONFIG.groupsEnabled,
    rankingsEnabled: legacyPayload.rankingsEnabled ?? DEFAULT_PLATFORM_CONFIG.rankingsEnabled,
    supportEnabled: legacyPayload.supportEnabled ?? DEFAULT_PLATFORM_CONFIG.supportEnabled,
    syllabusEnabled: DEFAULT_PLATFORM_CONFIG.syllabusEnabled,
    maintenanceMode: DEFAULT_PLATFORM_CONFIG.maintenanceMode,
    maintenanceMessage: '',
    maintenanceEta: '',
    noticeType: 'info',
    notice: legacyPayload.notice || '',
  };

  assert.equal(resolved.groupsEnabled, false);
  assert.equal(resolved.rankingsEnabled, true);
  assert.equal(resolved.maintenanceMode, false);
  assert.equal(resolved.syllabusEnabled, false);
  assert.equal(resolved.notice, 'Routine update');
  assert.equal(resolved.noticeType, 'info');
});

test('Maintenance routing intercepts disabled features while protecting timer and admin', () => {
  const resolveMaintenance=resolveFeaturePause;

  // 1. Normal state: nothing is paused
  assert.deepEqual(resolveMaintenance(DEFAULT_PLATFORM_CONFIG, 'groups'), { isMaintenance: false, title: '' });
  assert.deepEqual(resolveMaintenance(DEFAULT_PLATFORM_CONFIG, 'rankings'), { isMaintenance: false, title: '' });
  assert.deepEqual(resolveMaintenance(DEFAULT_PLATFORM_CONFIG, 'timer'), { isMaintenance: false, title: '' });

  // 2. Groups paused: groups view is intercepted, others normal
  const groupsPaused: PlatformConfig = { ...DEFAULT_PLATFORM_CONFIG, groupsEnabled: false };
  assert.deepEqual(resolveMaintenance(groupsPaused, 'groups'), { isMaintenance: true, title: 'Live Study Groups' });
  assert.deepEqual(resolveMaintenance(groupsPaused, 'timer'), { isMaintenance: false, title: '' });
  assert.deepEqual(resolveMaintenance(groupsPaused, 'rankings'), { isMaintenance: false, title: '' });

  // 3. Rankings paused: rankings view is intercepted
  const rankingsPaused: PlatformConfig = { ...DEFAULT_PLATFORM_CONFIG, rankingsEnabled: false };
  assert.deepEqual(resolveMaintenance(rankingsPaused, 'rankings'), { isMaintenance: true, title: 'Community Leaderboard & Rankings' });

  // 4. Master Maintenance: intercepts public views, but preserves offline timer and admin view
  const masterMaintenance: PlatformConfig = {
    ...DEFAULT_PLATFORM_CONFIG,
    maintenanceMode: true,
    maintenanceMessage: 'System upgrade in progress',
    maintenanceEta: '20 minutes',
  };
  assert.deepEqual(resolveMaintenance(masterMaintenance, 'groups'), { isMaintenance: true, title: 'Sanctra Sanctuary' });
  assert.deepEqual(resolveMaintenance(masterMaintenance, 'rankings'), { isMaintenance: true, title: 'Sanctra Sanctuary' });
  assert.deepEqual(resolveMaintenance(masterMaintenance, 'analytics'), { isMaintenance: true, title: 'Sanctra Sanctuary' });
  assert.deepEqual(resolveMaintenance(masterMaintenance, 'planner'), { isMaintenance: true, title: 'Sanctra Sanctuary' });
  assert.deepEqual(resolveMaintenance(masterMaintenance, 'timer'), { isMaintenance: false, title: '' });
  assert.deepEqual(resolveMaintenance(masterMaintenance, 'admin'), { isMaintenance: false, title: '' });
});

test('normalization strips server metadata and restores legacy missing flag defaults',()=>{
 const result=normalizePlatformConfig({groupsEnabled:false,notice:'Legacy',noticeType:'bogus',actorUid:'owner',updatedAt:1} as any);
 assert.equal(result.groupsEnabled,false);assert.equal(result.supportEnabled,true);assert.equal(result.noticeType,'info');assert.equal(result.maintenanceMode,false);
 assert.equal('actorUid' in result,false);assert.equal('updatedAt' in result,false);
});

test('whole-site pause respects its schedule and legacy defaults remain open',()=>{
 const paused={...DEFAULT_PLATFORM_CONFIG,sitePaused:true,pauseStartsAt:200,pauseEndsAt:300};
 assert.equal(isSitePaused(paused,199),false);assert.equal(isSitePaused(paused,200),true);assert.equal(isSitePaused(paused,300),false);
 assert.equal(isSitePaused(DEFAULT_PLATFORM_CONFIG,250),false);
 const normalized=normalizePlatformConfig({chatEnabled:false,pauseStartsAt:-4,pauseEndsAt:'bad'} as any);
 assert.equal(normalized.chatEnabled,false);assert.equal(normalized.chatAttachmentsEnabled,true);assert.equal(normalized.pauseStartsAt,0);assert.equal(normalized.pauseEndsAt,0);
});

test('JEE Track is enabled by default and respects admin pause',()=>{
  assert.equal(normalizePlatformConfig({}).jeeTrackEnabled,true);
  assert.equal(normalizePlatformConfig({jeeTrackEnabled:false} as any).jeeTrackEnabled,false);
  assert.equal(resolveFeaturePause(DEFAULT_PLATFORM_CONFIG,'jeetrack').isMaintenance,false);
  assert.equal(resolveFeaturePause({...DEFAULT_PLATFORM_CONFIG,jeeTrackEnabled:false},'jeetrack').isMaintenance,true);
  assert.equal(resolveFeaturePause({...DEFAULT_PLATFORM_CONFIG,jeeTrackEnabled:true,maintenanceMode:true},'jeetrack').isMaintenance,true);
  assert.equal(resolveFeaturePause(DEFAULT_PLATFORM_CONFIG,'timer').isMaintenance,false);
  assert.equal(resolveFeaturePause(DEFAULT_PLATFORM_CONFIG,'admin').isMaintenance,false);
});
