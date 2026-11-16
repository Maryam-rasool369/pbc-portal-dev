import React, { useState } from "react";
import TableHeadRowItemUser from "@/components/table/table-head-row-item-user";
import usersData from "@/data/users.json";
import TableRowItemUser from "./table-row-item-user";
import Breadcrumb from "../headers/breadcrumb";
import Link from "next/link";

interface TableUserProps {
  showAddModal: React.MouseEventHandler<HTMLButtonElement>;
  showEditModal: React.MouseEventHandler<HTMLButtonElement>;
  showDeleteModal: React.MouseEventHandler<HTMLButtonElement>;
}

export default function TableUser(props: TableUserProps) {
  const { showAddModal, showEditModal, showDeleteModal } = props;

  const [searchValue, setSearchValue] = useState("");

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearchValue(event.target.value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  const tableTitle = [
    "Name",
    "Role",
    "Country",
    "Membership",
    "Status",
    "Actions",
  ];

  const listTableTitle = tableTitle.map((title) => (
    <TableHeadRowItemUser key={title} title={title} />
  ));

  const listUsers = usersData.map((user) => (
    <TableRowItemUser
      key={user.id}
      id={user.id}
      avatar={user.avatar}
      country={user.country}
      name={user.name}
      email={user.email}
      position={user.role}
      membership={user.membership || "UnActive"}
      status={user.status}
      showEditModal={showEditModal}
      showDeleteModal={showDeleteModal}
    />
  ));

  return (
    <>
      <div className="p-4 bg-white block sm:flex items-center justify-between border-b border-gray-200 lg:mt-1.5 dark:bg-gray-800 dark:border-gray-700">
        <div className="w-full mb-1">
          <div className="mb-4">
            <Breadcrumb />
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">
              All users
            </h1>
          </div>
          <div className="sm:flex">
            <div className="items-center hidden mb-3 sm:flex sm:divide-x sm:divide-gray-100 sm:mb-0 dark:divide-gray-700">
              <form
                onSubmit={handleSubmit}
                className="lg:pr-3"
                action="#"
                method="GET"
              >
                <label htmlFor="users-search" className="sr-only">
                  Search
                </label>
                <div className="relative mt-1 lg:w-64 xl:w-96">
                  <input
                    type="text"
                    name="email"
                    id="users-search"
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-primary-500 dark:focus:border-primary-500"
                    placeholder="Search for users"
                    value={searchValue}
                    onChange={handleInputChange}
                  />
                </div>
              </form>
            </div>
            <div className="flex items-center ml-auto space-x-2 sm:space-x-3">
              <button
                className="inline-flex items-center justify-center w-1/2 px-3 py-2 text-sm font-medium text-center text-white rounded-lg bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 sm:w-auto dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800"
                type="button"
                data-modal-toggle="add-user-modal"
                onClick={showAddModal}
              >
                <svg
                  className="w-5 h-5 mr-2 -ml-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Add user
              </button>
              <Link
                href="#"
                className="inline-flex items-center justify-center w-1/2 px-3 py-2 text-sm font-medium text-center text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 focus:ring-4 focus:ring-primary-300 sm:w-auto dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-gray-700"
              >
                <svg
                  className="w-5 h-5 mr-2 -ml-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z"
                    clipRule="evenodd"
                  ></path>
                </svg>
                Import
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden shadow">
              <table className="min-w-full divide-y divide-gray-200 table-fixed dark:divide-gray-600">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="p-4">
                      <div className="flex items-center">
                        <input
                          id="checkbox-all"
                          aria-describedby="checkbox-1"
                          type="checkbox"
                          className="w-4 h-4 border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300 dark:focus:ring-primary-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label htmlFor="checkbox-all" className="sr-only">
                          checkbox
                        </label>
                      </div>
                    </th>
                    {listTableTitle}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {listUsers}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
