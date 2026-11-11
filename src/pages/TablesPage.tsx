import { useMemo } from "react";
import { useAtom, useSetAtom } from "jotai";
import { find, groupBy, sortBy } from "lodash-es";
import { Link } from "react-router-dom";

import {
  Container,
  Stack,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Fab,
  Checkbox,
  IconButton,
  Zoom,
} from "@mui/material";

import ViewListIcon from "@mui/icons-material/ViewListOutlined";
import ViewGridIcon from "@mui/icons-material/ViewModuleOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import EditIcon from "@mui/icons-material/EditOutlined";
import AddIcon from "@mui/icons-material/Add";
import InfoIcon from "@mui/icons-material/InfoOutlined";

import FloatingSearch from "@src/components/FloatingSearch";
import SlideTransition from "@src/components/Modal/SlideTransition";
import TableGrid from "@src/components/Tables/TableGrid";
import TableList from "@src/components/Tables/TableList";
import HomeWelcomePrompt from "@src/components/Tables/HomeWelcomePrompt";
import EmptyState from "@src/components/EmptyState";

import {
  projectScope,
  userRolesAtom,
  userSettingsAtom,
  updateUserSettingsAtom,
  tablesAtom,
  tablesViewAtom,
  tableSettingsDialogAtom,
} from "@src/atoms/projectScope";
import { TableSettings } from "@src/types/table";
import { ROUTES } from "@src/constants/routes";
import useBasicSearch from "@src/hooks/useBasicSearch";
import { TOP_BAR_HEIGHT } from "@src/layouts/Navigation/TopBar";
import { useScrollToHash } from "@src/hooks/useScrollToHash";

const SEARCH_KEYS = ["id", "name", "section", "description"];

export default function TablesPage() {
  const [userRoles] = useAtom(userRolesAtom, projectScope);
  const [userSettings] = useAtom(userSettingsAtom, projectScope);
  const [updateUserSettings] = useAtom(updateUserSettingsAtom, projectScope);
  const [tables] = useAtom(tablesAtom, projectScope);
  const [view, setView] = useAtom(tablesViewAtom, projectScope);
  const openTableSettingsDialog = useSetAtom(
    tableSettingsDialogAtom,
    projectScope
  );
  useScrollToHash();

  const [results, query, handleQuery] = useBasicSearch(
    tables ?? [],
    SEARCH_KEYS
  );

  const favorites = useMemo(
    () =>
      Array.isArray(userSettings.favoriteTables)
        ? userSettings.favoriteTables
        : [],
    [userSettings.favoriteTables]
  );
  const sections: Record<string, TableSettings[]> = useMemo(
    () => ({
      Favorites: favorites.map((id) =>
        find(results, { id })
      ) as TableSettings[],
      ...groupBy(sortBy(results, ["section", "name"]), "section"),
    }),
    [favorites, results]
  );

  if (!Array.isArray(tables))
    throw new Error(
      "Project settings are not configured correctly. `tables` is not an array."
    );

  const createTableFab = (
    <Tooltip title="Create table">
      <Zoom in>
        <Fab
          color="secondary"
          aria-label="Create table"
          onClick={() => openTableSettingsDialog({ mode: "create" })}
          sx={{
            zIndex: "speedDial",
            position: "fixed",
            bottom: (theme) => ({
              xs: `max(${theme.spacing(2)}, env(safe-area-inset-bottom))`,
              sm: `max(${theme.spacing(3)}, env(safe-area-inset-bottom))`,
            }),
            right: (theme) => ({
              xs: `max(${theme.spacing(2)}, env(safe-area-inset-right))`,
              sm: `max(${theme.spacing(3)}, env(safe-area-inset-right))`,
            }),
          }}
        >
          <AddIcon />
        </Fab>
      </Zoom>
    </Tooltip>
  );

  if (tables.length === 0) {
    if (userRoles.includes("ADMIN"))
      return (
        <>
          <HomeWelcomePrompt />
          {createTableFab}
        </>
      );

    return (
      <EmptyState
        message="No tables"
        description="There are no tables in this project. Sign in with an ADMIN account to create tables."
        fullScreen
        style={{ marginTop: -TOP_BAR_HEIGHT }}
      />
    );
  }

  const getLink = (table: TableSettings) =>
    `${ROUTES.table}/${table.id.replace(/\//g, "~2F")}`;

  const handleFavorite =
    (id: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const favoriteTables = e.target.checked
        ? [...favorites, id]
        : favorites.filter((f) => f !== id);

      if (updateUserSettings) updateUserSettings({ favoriteTables });
    };

  const getActions = (table: TableSettings) => (
    <>
      {userRoles.includes("ADMIN") && (
        <Tooltip title="Edit Table">
          <IconButton
            aria-label="Edit table"
            onClick={() =>
              openTableSettingsDialog({ mode: "update", data: table })
            }
            size={view === "list" ? "large" : undefined}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Favorite">
        <Checkbox
          onChange={handleFavorite(table.id)}
          checked={favorites.includes(table.id)}
          icon={<FavoriteBorderIcon />}
          checkedIcon={
            <Zoom in>
              <FavoriteIcon />
            </Zoom>
          }
          name={`favorite-${table.id}`}
          inputProps={{ "aria-label": "Favorite" }}
          sx={view === "list" ? { p: 1.5 } : undefined}
          color="secondary"
        />
      </Tooltip>
      <Tooltip title="Table information">
        <IconButton
          aria-label="Table information"
          size={view === "list" ? "large" : undefined}
          component={Link}
          to={`${getLink(table)}#sideDrawer="table-information"`}
          style={{ marginLeft: 0 }}
        >
          <InfoIcon />
        </IconButton>
      </Tooltip>
    </>
  );

  return (
    <Container component="main" sx={{ px: 1, pt: 1, pb: 7 + 3 + 3 }}>
      <FloatingSearch
        label="Search tables"
        onChange={(e) => handleQuery(e.target.value)}
        paperSx={{
          maxWidth: (theme) => ({
            md: theme.breakpoints.values.sm - 48 * 4,
            lg: theme.breakpoints.values.sm - 48,
          }),
          mb: { xs: 2, md: -6 },
        }}
      />

      <SlideTransition in timeout={50}>
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography
            variant="h6"
            component="h1"
            sx={{ pl: 2, cursor: "default" }}
          >
            {query ? `${results.length} of ${tables.length}` : tables.length}{" "}
            tables
          </Typography>

          <ToggleButtonGroup
            value={view}
            size="large"
            exclusive
            onChange={(_, v) => {
              if (v !== null) setView(v);
            }}
            aria-label="Table view"
            sx={{ "& .MuiToggleButton-root": { borderRadius: 2 } }}
          >
            <ToggleButton value="list" aria-label="List view">
              <ViewListIcon style={{ transform: "rotate(180deg)" }} />
            </ToggleButton>
            <ToggleButton value="grid" aria-label="Grid view">
              <ViewGridIcon />
            </ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </SlideTransition>

      {view === "list" ? (
        <TableList
          sections={sections}
          getLink={getLink}
          getActions={getActions}
        />
      ) : (
        <TableGrid
          sections={sections}
          getLink={getLink}
          getActions={getActions}
        />
      )}

      {userRoles.includes("ADMIN") && createTableFab}
    </Container>
  );
}
