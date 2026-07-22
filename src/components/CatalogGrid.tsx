"use client";

import React from "react";
import { CatalogCard, ResourceItem } from "./CatalogCard";

interface CatalogGridProps {
  data: {
    adobeSoftware: ResourceItem[];
    plugins: ResourceItem[];
    scripts: ResourceItem[];
    assets: ResourceItem[];
    utilities: ResourceItem[];
    courses: ResourceItem[];
    creator_product?: ResourceItem[];
  };
  sectionNames?: Record<string, string>;
  searchQuery: string;
  currency: "INR" | "USD";
  favorites: Record<string, boolean>;
  onToggleFavorite: (itemId: string, itemData: any, type: string) => void;
  onItemClick: (collectionName: string, itemId: string) => void;
  activeTab?: string;
}

const DEFAULT_SECTION_NAMES: Record<string, string> = {
  adobeSoftware: "Adobe Software",
  plugins: "Premium Plugins",
  scripts: "Scripts & Extensions",
  assets: "VFX Assets",
  utilities: "Utilities",
  courses: "Courses",
  creator_product: "Community Creations",
};

export const CatalogGrid: React.FC<CatalogGridProps> = ({
  data,
  sectionNames = {},
  searchQuery,
  currency,
  favorites,
  onToggleFavorite,
  onItemClick,
  activeTab,
}) => {
  const displayNames = { ...DEFAULT_SECTION_NAMES, ...sectionNames };

  const sections = [
    { id: "software", key: "adobeSoftware", sub: "Pre-configured design tools ready to build assets." },
    { id: "plugins", key: "plugins", sub: "Third party plug-in integrations for visual effects." },
    { id: "scripts", key: "scripts", sub: "Custom automation scripts and panel extensions." },
    { id: "assets", key: "assets", sub: "Sound packs, transition elements, and textures." },
    { id: "utilities", key: "utilities", sub: "Essential system tools, codecs, and settings overrides." },
    { id: "courses", key: "courses", sub: "Step by step creative masterclasses." },
    { id: "community", key: "creator_product", sub: "Assets, tools, and courses built by our community creators." },
  ] as const;

  const filterItems = (items: ResourceItem[]) => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.Title.toLowerCase().includes(query) ||
        item.Description?.toLowerCase().includes(query)
    );
  };

  return (
    <div className="space-y-20">
      {sections.map((section) => {
        const rawItems = data[section.key] || [];
        const filteredItems = filterItems(rawItems);

        // Hide section if searching and there are no matching items
        if (searchQuery && filteredItems.length === 0) return null;

        // If not searching, only show the active tab (if one is provided)
        if (!searchQuery && activeTab && section.id !== activeTab) return null;

        return (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white tracking-tight border-l-4 border-brand-500 pl-3">
                {displayNames[section.key] || section.key}
              </h2>
              <p className="text-xs text-gray-500 mt-1 pl-3">{section.sub}</p>
            </div>

            {filteredItems.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 pl-3">
                {displayNames[section.key]} will appear here once added via the Admin.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredItems.map((item) => (
                  <CatalogCard
                    key={item.id}
                    item={item}
                    collectionName={section.key}
                    currency={currency}
                    isFavorite={!!favorites[item.id]}
                    onToggleFavorite={() =>
                      onToggleFavorite(item.id, item, section.key)
                    }
                    onClick={() => onItemClick(section.key, item.id)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
