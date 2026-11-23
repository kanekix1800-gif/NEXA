import {
  Accessibility,
  Bus,
  Droplets,
  GraduationCap,
  HeartHandshake,
  Lightbulb,
  MapPin,
  Music,
  Recycle,
  Stethoscope,
  Tent,
  TrafficCone,
  Trash2,
  TriangleAlert,
  Trophy,
  Users,
} from 'lucide-react'

import { badge, P, problem } from '../scene'
import type { IllustrationMap } from '../types'

/** Capas de eventos/iniciativas (clima de comunidade reunida) e de demandas (o problema em destaque). */
export const communityIllustrations: IllustrationMap = {
  // Eventos e iniciativas
  fair: badge({ icon: Tent, bg: P.sun100, blob: P.sun200, accent: P.sun600 }),
  health: badge({ icon: Stethoscope, bg: P.green100, blob: P.cream100, accent: P.terracotta }),
  donation: badge({ icon: HeartHandshake, bg: P.pinkSoft, blob: P.sun100, accent: P.pink }),
  workshop: badge({ icon: GraduationCap, bg: P.blueSoft, blob: P.cream100, accent: P.blue }),
  cleanup: badge({ icon: Recycle, bg: P.green50, blob: P.green200, accent: P.green800 }),
  culture: badge({ icon: Music, bg: P.purpleSoft, blob: P.sun100, accent: P.purple }),
  sports: badge({ icon: Trophy, bg: P.tealSoft, blob: P.cream100, accent: P.teal }),
  meeting: badge({ icon: Users, bg: P.cream200, blob: P.green100, accent: P.green800 }),

  // Demandas
  pothole: problem({
    icon: TrafficCone,
    bg: P.terracottaSoft,
    blob: P.cream100,
    accent: P.terracotta,
  }),
  trash: problem({ icon: Trash2, bg: P.green100, blob: P.cream100, accent: P.green800 }),
  'dark-street': problem({
    icon: Lightbulb,
    bg: P.green900,
    blob: P.green800,
    accent: P.sun400,
    ink: P.sun600,
    hillBack: P.green800,
    hillFront: P.green950,
  }),
  bus: problem({ icon: Bus, bg: P.blueSoft, blob: P.cream100, accent: P.blue }),
  accessibility: problem({
    icon: Accessibility,
    bg: P.purpleSoft,
    blob: P.cream100,
    accent: P.purple,
  }),
  sanitation: problem({ icon: Droplets, bg: P.tealSoft, blob: P.cream100, accent: P.teal }),
  infrastructure: problem({
    icon: TriangleAlert,
    bg: P.goldSoft,
    blob: P.cream100,
    accent: P.gold,
  }),
  'generic-demand': problem({ icon: MapPin, bg: P.cream200, blob: P.green100, accent: P.green800 }),
}
