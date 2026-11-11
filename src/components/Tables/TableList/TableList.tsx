import { TransitionGroup } from "react-transition-group";

import { Box, Paper, Collapse, List } from "@mui/material";

import SectionHeading from "@src/components/SectionHeading";
import TableListItem from "./TableListItem";
import SlideTransition from "@src/components/Modal/SlideTransition";
import {
  computeSectionAnimationTimeout,
  EXIT_ANIMATION_TIMEOUT_MS,
} from "../TableGrid/TableGrid";

import { TableSettings } from "@src/types/table";

export interface ITableListProps {
  sections: Record<string, TableSettings[]>;
  getLink: (table: TableSettings) => string;
  getActions?: (table: TableSettings) => React.ReactNode;
}

export default function TableList({
  sections,
  getLink,
  getActions,
}: ITableListProps) {
  return (
    <TransitionGroup>
      {Object.entries(sections).map(
        ([sectionName, sectionTables], sectionIndex) => {
          const sectionTimeout = computeSectionAnimationTimeout(sectionIndex);
          const tableItems = sectionTables
            .map((table) => {
              if (!table) return null;

              return (
                <Collapse key={table.id} timeout={EXIT_ANIMATION_TIMEOUT_MS}>
                  <TableListItem
                    {...table}
                    link={getLink(table)}
                    actions={getActions ? getActions(table) : null}
                  />
                </Collapse>
              );
            })
            .filter((item) => item !== null);

          if (tableItems.length === 0) return null;

          return (
            <Collapse key={sectionName} timeout={EXIT_ANIMATION_TIMEOUT_MS}>
              <Box component="section" sx={{ mt: 4 }}>
                <SlideTransition
                  key={"list-section-" + sectionName}
                  in
                  timeout={sectionTimeout}
                >
                  <SectionHeading sx={{ pl: 2, pr: 1 }}>
                    {sectionName}
                  </SectionHeading>
                </SlideTransition>

                <SlideTransition in timeout={sectionTimeout}>
                  <Paper>
                    <List disablePadding>
                      <TransitionGroup>{tableItems}</TransitionGroup>
                    </List>
                  </Paper>
                </SlideTransition>
              </Box>
            </Collapse>
          );
        }
      )}
    </TransitionGroup>
  );
}
