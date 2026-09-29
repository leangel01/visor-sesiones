import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Input,
  Pagination,
  Select,
  Spin,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CalendarOutlined, LogoutOutlined, SearchOutlined } from "@ant-design/icons";
import { supabaseClient } from "../../providers/supabase-client";

type Evento = {
  id: string;
  title: string;
  start_date: string;
  tipo_sesion: string | null;
  sector: string | null;
  institucion: string | null;
  responsable: string | null;
};

type DateMode = "day" | "range";
type FacetField = "tipo_sesion" | "responsable" | "sector" | "institucion";
type Facets = Record<FacetField, string[]>;
const UNASSIGNED = "__sin_asignar__";

function facetValue(event: Evento, field: FacetField) {
  return event[field]?.trim() || UNASSIGNED;
}

function facetLabel(value: string) {
  return value === UNASSIGNED ? "Sin asignar" : value;
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const dateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const eventDate = (value: string) => {
  const date = new Date(value);
  return dateInputValue(date);
};

const monthStart = () => {
  const today = new Date();
  return dateInputValue(new Date(today.getFullYear(), today.getMonth(), 1));
};

function groupCounts(
  events: Evento[],
  field: "tipo_sesion" | "responsable" | "sector",
) {
  const counts = new Map<string, number>();
  events.forEach((event) => {
    const value = event[field]?.trim() || "Sin asignar";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()].sort(
    (left, right) =>
      right[1] - left[1] || left[0].localeCompare(right[0], "es"),
  );
}

function MetricGroup({
  title,
  entries,
  color,
}: {
  title: string;
  entries: [string, number][];
  color: string;
}) {
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <section
      className="metric-group"
      style={{ "--metric-color": color } as React.CSSProperties}
    >
      <div className="metric-heading">
        <span>{title}</span>
        <strong>{entries.reduce((sum, [, count]) => sum + count, 0)}</strong>
      </div>
      {entries.length ? (
        <div className="metric-list">
          {entries.map(([label, count]) => (
            <div className="metric-row" key={label}>
              <span title={label}>{label}</span>
              <i>
                <b style={{ width: `${(count / max) * 100}%` }} />
              </i>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="metric-empty">Sin registros para este periodo</p>
      )}
    </section>
  );
}

export function DashboardPage() {
  const [events, setEvents] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("Usuario");
  const [dateMode, setDateMode] = useState<DateMode>("range");
  const [day, setDay] = useState(dateInputValue(new Date()));
  const [dateStart, setDateStart] = useState(monthStart());
  const [dateEnd, setDateEnd] = useState(dateInputValue(new Date()));
  const [facets, setFacets] = useState<Facets>({
    tipo_sesion: [],
    responsable: [],
    sector: [],
    institucion: [],
  });
  const [search, setSearch] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [pageSize, setPageSize] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { data: userData } = await supabaseClient.auth.getUser();
      if (userData.user) {
        const { data: profile } = await supabaseClient
          .from("perfiles_usuarios")
          .select("nombre")
          .eq("id", userData.user.id)
          .maybeSingle();
        const metadata = userData.user.user_metadata ?? {};
        const metadataName = [metadata.full_name, metadata.name].find(
          (value): value is string =>
            typeof value === "string" && value.trim().length > 0,
        );
        if (active)
          setDisplayName(
            profile?.nombre?.trim() || metadataName?.trim() || "Usuario",
          );
      }
      const pageSize = 1000;
      const records: Evento[] = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabaseClient
          .from("eventos")
          .select(
            "id, title, start_date, tipo_sesion, responsable, sector, institucion",
          )
          .order("start_date", { ascending: false })
          .range(offset, offset + pageSize - 1);
        if (error) {
          if (active) setLoadError(error.message);
          break;
        }
        records.push(...(data as Evento[]));
        if (!data || data.length < pageSize) break;
      }
      if (active) {
        setEvents(records);
        setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const dateFiltered = useMemo(
    () =>
      events.filter((event) => {
        const date = eventDate(event.start_date);
        return dateMode === "day"
          ? date === day
          : date >= dateStart && date <= dateEnd;
      }),
    [events, dateMode, day, dateStart, dateEnd],
  );

  const availableOptions = (field: FacetField) =>
    [
      ...new Set(
        dateFiltered
          .filter((event) =>
            (Object.keys(facets) as FacetField[]).every(
              (key) =>
                key === field ||
                facets[key].length === 0 ||
                facets[key].includes(facetValue(event, key)),
            ),
          )
          .map((event) => facetValue(event, field)),
      ),
    ].sort((left, right) =>
      facetLabel(left).localeCompare(facetLabel(right), "es"),
    );

  useEffect(() => {
    setFacets((current) => {
      const next = { ...current };
      let changed = false;
      (Object.keys(current) as FacetField[]).forEach((field) => {
        const validOptions = availableOptions(field);
        const validSelections = next[field].filter((value) =>
          validOptions.includes(value),
        );
        if (validSelections.length !== next[field].length) {
          next[field] = validSelections;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [dateFiltered, facets]);

  const filteredEvents = useMemo(
    () =>
      dateFiltered.filter(
        (event) =>
          (facets.tipo_sesion.length === 0 ||
            facets.tipo_sesion.includes(facetValue(event, "tipo_sesion"))) &&
          (facets.responsable.length === 0 ||
            facets.responsable.includes(facetValue(event, "responsable"))) &&
          (facets.sector.length === 0 ||
            facets.sector.includes(facetValue(event, "sector"))) &&
          (facets.institucion.length === 0 ||
            facets.institucion.includes(facetValue(event, "institucion"))) &&
          (!search ||
            [
              event.title,
              event.institucion,
              event.responsable,
              event.sector,
              event.tipo_sesion,
            ].some((value) =>
              value
                ?.toLocaleLowerCase("es")
                .includes(search.toLocaleLowerCase("es")),
            )),
      ),
    [dateFiltered, facets, search],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredEvents]);

  const pageEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  const columns: ColumnsType<Evento> = [
    {
      title: "Sector",
      dataIndex: "sector",
      width: 150,
      render: (value: string | null) =>
        value ? <Tag className="sector-tag">{value}</Tag> : "Sin asignar",
    },
    {
      title: "Institución",
      dataIndex: "institucion",
      width: 200,
      render: (value: string | null) => value || "Sin asignar",
    },
    {
      title: "Tipo de sesión",
      dataIndex: "tipo_sesion",
      width: 150,
      render: (value: string | null) => value || "Sin asignar",
    },
    {
      title: "Fecha",
      dataIndex: "start_date",
      width: 145,
      render: (value: string) => formatEventDate(value),
    },
    {
      title: "Sesión",
      dataIndex: "title",
      width: 270,
      render: (value: string) => (
        <strong className="event-title">{value}</strong>
      ),
    },
    {
      title: "Responsable",
      dataIndex: "responsable",
      width: 160,
      render: (value: string | null) => value || "Sin asignar",
    },
  ];

  const signOut = async () => {
    setSigningOut(true);
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
      message.error(error.message);
      setSigningOut(false);
    } else window.location.hash = "/ingresar";
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <a href="#/" className="brand">
          <span className="brand-icon" aria-hidden="true">
            <CalendarOutlined />
          </span>
          <span>
            VISOR DE SESIONES<small>DGPCMC 2</small>
          </span>
        </a>
        <div className="header-user">
          <span title={displayName}>{displayName}</span>
          <Button
            icon={<LogoutOutlined />}
            loading={signingOut}
            onClick={signOut}
          >
            Cerrar sesión
          </Button>
        </div>
      </header>
      <div className="dashboard-content">
        <div className="page-intro">
          <div>
            <h1 className="page-title">
              Seguimiento de reuniones registradas.
            </h1>
          </div>
          <div className="result-total">
            <span>TOTAL</span>
            <strong>
              {loading ? (
                <Spin size="small" />
              ) : (
                filteredEvents.length.toLocaleString("es-MX")
              )}
            </strong>
          </div>
        </div>
        {loadError && (
          <Alert
            className="data-error"
            type="error"
            showIcon
            message="No se pudieron cargar los eventos"
            description={
              <>
                {loadError} Revisa que la migración de lectura de eventos esté
                aplicada en Supabase y que la sesión tenga acceso a
                public.eventos.
              </>
            }
          />
        )}

        <section className="filter-panel" aria-label="Filtros de eventos">
          <div className="filter-topline">
            <h2>Filtros</h2>
            <Button
              type="link"
              onClick={() => {
                setDateMode("range");
                setDateStart(monthStart());
                setDateEnd(dateInputValue(new Date()));
                setDay(dateInputValue(new Date()));
                setFacets({
                  tipo_sesion: [],
                  responsable: [],
                  sector: [],
                  institucion: [],
                });
                setSearch("");
              }}
            >
              Restablecer filtros
            </Button>
          </div>
          <div className="filter-grid">
            <div className="filter-field date-filter">
              <label>Periodo</label>
              <div className="date-mode">
                <button
                  className={dateMode === "range" ? "selected" : ""}
                  onClick={() => setDateMode("range")}
                >
                  Rango
                </button>
                <button
                  className={dateMode === "day" ? "selected" : ""}
                  onClick={() => setDateMode("day")}
                >
                  Día
                </button>
              </div>
              {dateMode === "day" ? (
                <input
                  aria-label="Día específico"
                  type="date"
                  value={day}
                  onChange={(event) => setDay(event.target.value)}
                />
              ) : (
                <div className="date-range">
                  <input
                    aria-label="Fecha inicial"
                    type="date"
                    value={dateStart}
                    max={dateEnd}
                    onChange={(event) => setDateStart(event.target.value)}
                  />
                  <span>a</span>
                  <input
                    aria-label="Fecha final"
                    type="date"
                    value={dateEnd}
                    min={dateStart}
                    onChange={(event) => setDateEnd(event.target.value)}
                  />
                </div>
              )}
            </div>
            {(
              [
                ["tipo_sesion", "Tipo de sesión"],
                ["responsable", "Responsable"],
                ["sector", "Sector"],
                ["institucion", "Institución"],
              ] as [FacetField, string][]
            ).map(([field, label]) => (
              <div className="filter-field" key={field}>
                <label>{label}</label>
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  maxTagCount="responsive"
                  optionFilterProp="label"
                  placeholder="Todos"
                  value={facets[field]}
                  options={availableOptions(field).map((value) => ({
                    value,
                    label: facetLabel(value),
                  }))}
                  onChange={(values: string[]) =>
                    setFacets((current) => ({
                      ...current,
                      [field]: values,
                    }))
                  }
                />
              </div>
            ))}
          </div>
          <div className="active-filter-note">
            
          </div>
        </section>

        <section className="metrics-grid" aria-label="Resumen por agrupación">
          <MetricGroup
            title="TIPO DE SESIÓN"
            entries={groupCounts(filteredEvents, "tipo_sesion")}
            color="#9b2247"
          />
          <MetricGroup
            title="RESPONSABLE"
            entries={groupCounts(filteredEvents, "responsable")}
            color="#1e5b4f"
          />
          <MetricGroup
            title="SECTOR"
            entries={groupCounts(filteredEvents, "sector")}
            color="#a57f2c"
          />
        </section>

        <section className="events-section">
          <div className="events-heading">
            <div>
              <p className="eyebrow">REGISTRO</p>
              <h2>Sesiones registradas</h2>
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar en resultados"
              className="table-search"
            />
          </div>
          <Table<Evento>
            rowKey="id"
            columns={columns}
            dataSource={pageEvents}
            loading={{ spinning: loading, tip: "Cargando registros" }}
            scroll={{ x: 1075 }}
            pagination={false}
            locale={{
              emptyText: "No hay eventos para los filtros seleccionados.",
            }}
          />
          <div className="table-pagination">
            <label className="page-size-control">
              <span>Filas por página</span>
              <select
                aria-label="Filas por página"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
              >
                {[12, 24, 48].map((value) => (
                  <option key={value} value={value}>
                    {value} / página
                  </option>
                ))}
              </select>
            </label>
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={filteredEvents.length}
              showSizeChanger={false}
              showQuickJumper
              showTotal={(total) => `${total.toLocaleString("es-MX")} eventos`}
              onChange={setCurrentPage}
            />
          </div>
        </section>
      </div>
      <footer className="dashboard-footer">
        <span> Proyecto visor de sesiones</span>
        <div className="footer-swatches" aria-hidden="true">
          {[
            "#e6d194",
            "#a57f2c",
            "#1e5b4f",
            "#002f2a",
            "#9b2247",
            "#611232",
            "#98989a",
            "#161a1d",
          ].map((color) => (
            <i key={color} style={{ backgroundColor: color }} />
          ))}
        </div>
      </footer>
    </main>
  );
}
