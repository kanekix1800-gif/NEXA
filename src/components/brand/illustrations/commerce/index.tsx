import {
  Bus,
  Croissant,
  Lightbulb,
  PawPrint,
  Pill,
  Scissors,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Store,
  Syringe,
  Utensils,
} from 'lucide-react'

import { badge, P, storefront } from '../scene'
import type { IllustrationMap } from '../types'

/** Capas de estabelecimentos (fachadas) e de notícias. */
export const commerceIllustrations: IllustrationMap = {
  bakery: storefront({ icon: Croissant, bg: P.sun100, blob: P.sun200, accent: P.sun600 }),
  pharmacy: storefront({ icon: Pill, bg: P.green100, blob: P.green200, accent: P.green800 }),
  market: storefront({
    icon: ShoppingBasket,
    bg: P.cream200,
    blob: P.green200,
    accent: P.green600,
  }),
  restaurant: storefront({
    icon: Utensils,
    bg: P.terracottaSoft,
    blob: P.sun100,
    accent: P.terracotta,
  }),
  salon: storefront({ icon: Scissors, bg: P.pinkSoft, blob: P.cream100, accent: P.pink }),
  'tech-repair': storefront({ icon: Smartphone, bg: P.blueSoft, blob: P.cream100, accent: P.blue }),
  clothing: storefront({ icon: Shirt, bg: P.purpleSoft, blob: P.cream100, accent: P.purple }),
  petshop: storefront({ icon: PawPrint, bg: P.tealSoft, blob: P.cream100, accent: P.teal }),
  storefront: storefront({ icon: Store, bg: P.green50, blob: P.green100, accent: P.green800 }),

  'bus-stop': badge({
    icon: Bus,
    bg: P.blueSoft,
    blob: P.cream100,
    accent: P.blue,
    bunting: false,
  }),
  vaccination: badge({
    icon: Syringe,
    bg: P.green100,
    blob: P.cream100,
    accent: P.terracotta,
    bunting: false,
  }),
  'street-lights': badge({
    icon: Lightbulb,
    bg: P.green900,
    blob: P.green800,
    accent: P.sun400,
    ink: P.sun600,
    hillBack: P.green800,
    hillFront: P.green950,
    bunting: false,
  }),
}
