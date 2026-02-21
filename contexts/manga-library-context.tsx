import React, { createContext, useContext, useMemo, useState } from "react";

export type MangaRecord = {
  id: string;
  title: string;
  prompt: string;
  totalPages: number;
  pageImageUrls: string[];
  pdfLocalUri: string;
  createdAt: string;
};

type MangaLibraryContextType = {
  mangas: MangaRecord[];
  addManga: (manga: Omit<MangaRecord, "id" | "createdAt">) => MangaRecord;
};

const MangaLibraryContext = createContext<MangaLibraryContextType | undefined>(
  undefined,
);

export function MangaLibraryProvider({ children }: { children: React.ReactNode }) {
  const [mangas, setMangas] = useState<MangaRecord[]>([]);

  const value = useMemo<MangaLibraryContextType>(() => {
    const addManga: MangaLibraryContextType["addManga"] = (manga) => {
      const next: MangaRecord = {
        ...manga,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString(),
      };

      setMangas((prev) => [next, ...prev]);
      return next;
    };

    return {
      mangas,
      addManga,
    };
  }, [mangas]);

  return (
    <MangaLibraryContext.Provider value={value}>
      {children}
    </MangaLibraryContext.Provider>
  );
}

export function useMangaLibrary() {
  const context = useContext(MangaLibraryContext);
  if (!context) {
    throw new Error("useMangaLibrary must be used within a MangaLibraryProvider");
  }
  return context;
}
