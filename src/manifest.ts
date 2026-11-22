import { z } from 'zod';
import type { PluginManifest } from '@wabs/plugin-sdk/manifest';

const metadata = require('../wa-plugin.json');
export const configSchema = z.object({
  publishCalendar: z.boolean().default(true)
});
export const manifest: PluginManifest = {
  ...metadata, configSchema, defaultMessages: require('../locales/en/official.workspace-calendar.json')
};
