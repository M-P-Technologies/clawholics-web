export interface HomeContent {
  home_title: string;
  home_services_subtitle: string;
  home_about_subtitle: string;
  home_about_image: string;
  /** Not sent by older backends; the home page falls back to DEFAULT_HERO_IMAGE */
  home_hero_image?: string;
}

export interface Service {
  id: number;
  name: string;
  category: string;
  description: string;
  junior_price: number;
  master_price: number;
  duration: string;
  image: string;
}

export interface Faq {
  id: number;
  question: string;
  answer: string;
}

export type TeamContent = {
  team_description: string;
};

export type Nailist = {
  id: number;
  name: string;
  position: string;
  specialty: string;
  bio: string;
  image: string;
};
