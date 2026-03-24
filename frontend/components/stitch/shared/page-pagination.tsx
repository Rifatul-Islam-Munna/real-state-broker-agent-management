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
  if (totalPages <= 1) {
    return null
  }

  const pages = getVisiblePageNumbers(currentPage, totalPages)

  return (
    <Pagination className="justify-end">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (currentPage > 1) {
                onPageChange(currentPage - 1)
              }
            }}
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
            href="#"
            onClick={(event) => {
              event.preventDefault()
              if (currentPage < totalPages) {
                onPageChange(currentPage + 1)
              }
            }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
