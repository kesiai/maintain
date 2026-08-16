import { useMemo, useRef, useState, type ReactNode } from 'react'
import {
  useTable,
  type CellContext,
  type ColumnDef,
  type HeaderContext,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type Updater,
} from '@tanstack/react-table'

import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import {
  DataGrid,
  DataGridContainer,
  dataGridFeatures,
  type DataGridFeatures,
} from '@/components/reui/data-grid/data-grid'
import { DataGridColumnHeader } from '@/components/reui/data-grid/data-grid-column-header'
import { DataGridPagination } from '@/components/reui/data-grid/data-grid-pagination'
import { DataGridScrollArea } from '@/components/reui/data-grid/data-grid-scroll-area'
import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from '@/components/reui/data-grid/data-grid-table'

export interface Column<T> {
  key: string
  title: ReactNode
  width?: number | string
  align?: 'left' | 'center' | 'right'
  /** 固定列：'left' | 'right'。不传 = 不固定。 */
  pinned?: 'left' | 'right'
  render?: (row: T, index: number) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  rowKey: (row: T) => string
  loading?: boolean
  /** 行选择 */
  selection?: {
    selected: string[]
    onSelect: (keys: string[]) => void
  }
  /**
   * 分页。不传 = 不分页（显示全部）。
   * 传入 current/total/onPageChange 时为服务端分页（data 已是当前页，不再本地切片）。
   */
  pagination?: {
    pageSize?: number
    current?: number
    total?: number
    onPageChange?: (page: number) => void
    /** 服务端分页时每页行数变化回调（一般配合回到第一页） */
    onPageSizeChange?: (size: number) => void
  }
  emptyText?: ReactNode
  onRowClick?: (row: T) => void
}

const SELECT_COLUMN_ID = '__select'

/** v9 的 state 更新器：函数式或直接值 */
function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(previous) : updater
}

export function DataTable<T extends RowData>({
  columns,
  data,
  rowKey,
  loading = false,
  selection,
  pagination,
  emptyText = '暂无数据',
  onRowClick,
}: DataTableProps<T>) {
  const [pageState, setPageState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pagination?.pageSize || 20,
  })

  const controlled = pagination?.current !== undefined
  // 未传 pagination 时显示全部（分页 size 给到数据长度，避免默认 10 条截断）
  // 传入 pagination 时以内部 state 为准（初始值来自 pagination.pageSize），保证 Rows per page 可选
  const pageSize = pagination ? pageState.pageSize : Math.max(data.length, 1)
  const pageCount = pagination
    ? Math.max(1, Math.ceil((pagination.total ?? data.length) / pageSize))
    : 1

  // 选择状态：Record<string, boolean> <-> string[]
  const rowSelection = useMemo<RowSelectionState>(
    () => Object.fromEntries((selection?.selected ?? []).map((k) => [k, true])),
    [selection?.selected],
  )

  // 固定列状态：由 columns 上的 pinned 声明推导
  const columnPinning = useMemo(
    () =>
      columns.some((c) => c.pinned)
        ? {
            start: columns.filter((c) => c.pinned === 'left').map((c) => c.key),
            end: columns.filter((c) => c.pinned === 'right').map((c) => c.key),
          }
        : undefined,
    [columns],
  )

  const columnDefs = useMemo<ColumnDef<DataGridFeatures, T>[]>(() => {
    const defs = columns.map((col) => {
      const alignClass =
        col.align === 'right'
          ? 'text-right'
          : col.align === 'center'
            ? 'text-center'
            : ''
      const width = typeof col.width === 'number' ? col.width : undefined
      return {
        id: col.key,
        accessorKey: col.key,
        header: ({ column }: HeaderContext<DataGridFeatures, T>) => (
          <DataGridColumnHeader title={col.title as string} column={column} />
        ),
        cell: ({ row, getValue }: CellContext<DataGridFeatures, T>) => {
          const value = col.render
            ? col.render(row.original, row.index)
            : (getValue() as ReactNode)
          return <div className={cn(alignClass, col.className)}>{value}</div>
        },
        size: width,
        enableSorting: true,
        enablePinning: !!col.pinned,
        meta: {
          headerClassName: alignClass,
          cellClassName: alignClass,
        },
      } as ColumnDef<DataGridFeatures, T>
    })

    if (selection) {
      defs.unshift({
        id: SELECT_COLUMN_ID,
        header: () => <DataGridTableRowSelectAll />,
        cell: ({ row }) => <DataGridTableRowSelect row={row} />,
        size: 44,
        enableSorting: false,
        enableResizing: false,
        enableHiding: false,
        meta: { headerClassName: 'text-center', cellClassName: 'text-center' },
      })
    }

    return defs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, !!selection])

  // v9 每次 state 变化都会重建 table，回调里需通过 ref 取最新实例
  const table = useTable<DataGridFeatures, T>({
    features: dataGridFeatures,
    columns: columnDefs,
    data,
    getRowId: rowKey,
    pageCount: controlled ? pageCount : undefined,
    state: {
      pagination: {
        pageIndex: controlled ? (pagination.current ?? 1) - 1 : pageState.pageIndex,
        pageSize,
      },
      ...(columnPinning ? { columnPinning } : {}),
      ...(selection ? { rowSelection } : {}),
    },
    onPaginationChange: (updater) => {
      const next = resolveUpdater(updater, tableRef.current.state.pagination)
      if (controlled) {
        // 每页行数变化：同步内部 size、通知父组件并回到第一页
        if (next.pageSize !== tableRef.current.state.pagination.pageSize) {
          setPageState((prev) => ({ ...prev, pageSize: next.pageSize }))
          pagination?.onPageSizeChange?.(next.pageSize)
          pagination?.onPageChange?.(1)
        } else {
          pagination?.onPageChange?.(next.pageIndex + 1)
        }
      } else {
        setPageState(next)
      }
    },
    ...(selection
      ? {
          enableRowSelection: true,
          onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
            const next = resolveUpdater(updater, tableRef.current.state.rowSelection)
            selection.onSelect(Object.keys(next).filter((k) => next[k]))
          },
        }
      : {}),
  })

  const tableRef = useRef(table)
  tableRef.current = table

  return (
    <DataGrid
      table={table}
      recordCount={pagination?.total ?? data.length}
      isLoading={loading}
      onRowClick={onRowClick as (row: RowData) => void}
      emptyMessage={emptyText}
      tableLayout={{
        // 有固定列时开启列固定（sticky 定位由 columnsPinnable 控制），否则关闭
        columnsPinnable: columns.some((c) => c.pinned),
        columnsResizable: true,
        headerSticky: true,
        rowBorder: true,
      }}
    >
      <div className="w-full space-y-2.5">
        <Card className="p-0">
          <DataGridContainer>
            <DataGridScrollArea>
              <DataGridTable />
            </DataGridScrollArea>
          </DataGridContainer>
        </Card>
        {pagination && <DataGridPagination />}
      </div>
    </DataGrid>
  )
}
