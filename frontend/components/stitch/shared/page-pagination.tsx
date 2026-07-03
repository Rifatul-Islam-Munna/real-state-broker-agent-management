"use client"

import { Fragment } from "react"

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { getVisiblePageNumbers } from "@/lib/admin-portal"

type PagePaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function PagePagination({
  currentPage,
  totalPages,
  onPageChange,
}: PagePaginationProps) {
  if (totalPages <= 1) return null

  const pages = getVisiblePageNumbers(currentPage, totalPages)
  const isFirstPage = currentPage <= 1
  const isLastPage = currentPage >= totalPages

  return (
    <Pagination className="justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            aria-disabled={isFirstPage}
            className={isFirstPage ? "pointer-events-none opacity-45" : undefined}
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (!isFirstPage) onPageChange(currentPage - 1)
            }}
            tabIndex={isFirstPage ? -1 : undefined}
          />
        </PaginationItem>
        {pages.map((page, index) => {
          const previousPage = pages[index - 1]
          const showEllipsis = previousPage && page - previousPage > 1

          return (
            <Fragment key={page}>
              {showEllipsis ? (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : null}
              <PaginationItem>
                <PaginationLink
                  href="#"
                  isActive={page === currentPage}
                  onClick={(event) => {
                    event.preventDefault()
                    onPageChange(page)
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            </Fragment>
          )
        })}
        <PaginationItem>
          <PaginationNext
            aria-disabled={isLastPage}
            className={isLastPage ? "pointer-events-none opacity-45" : undefined}
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (!isLastPage) onPageChange(currentPage + 1)
            }}
            tabIndex={isLastPage ? -1 : undefined}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
