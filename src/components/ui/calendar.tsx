import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  // Si `selected` est defini et `defaultMonth` ne l'est pas, on ouvre le
  // calendrier sur le mois de la date selectionnee (et non sur le mois courant).
  // Bug corrige : sur les filtres "Jour", apres avoir choisi une date dans un
  // autre mois puis ferme le popover, la reouverture revenait au mois courant.
  const computedDefaultMonth = React.useMemo(() => {
    if ((props as { defaultMonth?: Date }).defaultMonth) {
      return (props as { defaultMonth?: Date }).defaultMonth;
    }
    const sel = (props as { selected?: unknown }).selected;
    if (!sel) return undefined;
    if (sel instanceof Date) return sel;
    if (Array.isArray(sel)) {
      return sel.find((d): d is Date => d instanceof Date);
    }
    if (typeof sel === 'object' && sel !== null) {
      const from = (sel as { from?: Date }).from;
      if (from instanceof Date) return from;
    }
    return undefined;
  }, [(props as { defaultMonth?: Date }).defaultMonth, (props as { selected?: unknown }).selected]);

  // Bornes annee par defaut pour le dropdown : 5 ans en arriere a l'annee
  // courante + 1. Le caller peut surcharger via fromYear / toYear.
  const currentYear = new Date().getFullYear();
  const defaultFromYear = currentYear - 5;
  const defaultToYear = currentYear + 1;

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      defaultMonth={computedDefaultMonth}
      captionLayout="dropdown-buttons"
      fromYear={defaultFromYear}
      toYear={defaultToYear}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        // En mode dropdown-buttons le caption_label est duplique a l'interieur
        // de chaque dropdown_root : on le masque pour ne garder que le <select>
        // natif lui-meme (style ci-dessous). Au top-level il est aussi pris en
        // sandwich par vhidden / sr-only — donc display:none est sans effet
        // visible la-bas.
        caption_label: "hidden",
        caption_dropdowns: "flex justify-center gap-2",
        // Le <select> reste visible : on le style directement comme un bouton.
        // La fleche est celle du navigateur (appearance native) ; pas d'overlay
        // opacity:0 qui casserait l'affichage des options en Chromium.
        dropdown: cn(
          "h-7 pl-2 pr-1 rounded-md border border-input bg-background text-sm font-medium",
          "hover:bg-white transition-colors cursor-pointer",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        ),
        dropdown_month: "relative",
        dropdown_year: "relative",
        vhidden: "sr-only",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
