/**
 * SIGIL - Scenario Loader
 * Loads and indexes scenario data for the game loop.
 * MVP: T1-T3 (pre-protocol) + T4 (post-protocol)
 */

import { EventBus } from '../core/bus.js';

export class ScenarioLoader {
  constructor() {
    this.bus = EventBus.getInstance();
    this.scenarios = new Map(); // id -> scenario
    this.turnIndex = new Map(); // turn number -> scenario id
    this.loaded = false;
  }

  /**
   * Load all scenario data
   */
  async loadAll() {
    const scenarioModules = [
      { path: '../../data/scenarios/t1-studio-epidemiologico.json', turn: 1 },
      { path: '../../data/scenarios/t2-fonte-anonima.json', turn: 2 },
      { path: '../../data/scenarios/t3-conferenza-stampa.json', turn: 3 },
      { path: '../../data/scenarios/t4-post-revelation.json', turn: 4 }
    ];

    for (const mod of scenarioModules) {
      try {
        const response = await fetch(new URL(mod.path, import.meta.url));
        const scenario = await response.json();
        this.scenarios.set(scenario.id, scenario);
        this.turnIndex.set(mod.turn, scenario.id);
      } catch (err) {
        console.error(`[ScenarioLoader] Failed to load ${mod.path}:`, err);
      }
    }

    this.loaded = true;
    this.bus.emit('scenarios:loaded', { count: this.scenarios.size });
  }

  /**
   * Get scenario for a specific turn
   */
  getForTurn(turn) {
    const id = this.turnIndex.get(turn);
    if (!id) return null;
    return this.scenarios.get(id) || null;
  }

  /**
   * Get scenario by ID
   */
  getById(id) {
    return this.scenarios.get(id) || null;
  }

  /**
   * Get all loaded scenarios
   */
  getAll() {
    return Array.from(this.scenarios.values());
  }
}
