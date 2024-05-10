'use client'
import React, { useState, useEffect } from 'react';
import { MdKeyboardArrowLeft, MdKeyboardArrowRight, MdOutlineEdit, MdDelete } from "react-icons/md";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoSearchSharp } from "react-icons/io5";

import { useAuth } from '@/app/auth';
import { useQuery, useMutation } from '@apollo/client';
import gql from 'graphql-tag';
import Link from 'next/link';

const GET_POSTS = gql`
  query GetPosts($start: Int!, $limitForCount: Int!, $limitForPosts: Int!, $searchTerm: String) {
    postsConnection(start: $start, limit: $limitForCount, where: {title_contains: $searchTerm}) {
      aggregate {
        count
      }
    }
    posts(sort: "updatedAt:desc", start: $start, limit: $limitForPosts, where: {title_contains: $searchTerm}) {
      id
      title
      slug
      category
      createdAt
      published
    }
  }
`;

const DELETE_POST = gql`
  mutation DeletePost($id: ID!) {
    deletePost(input: {
      where: {
        id: $id
      }
    }) {
      post {
        id
      }
    }
  }
`;

export default function Post() {
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [deleteSuccess, setDeleteSuccess] = useState(false); // Track delete success message
    const pageSize = 10;
    const { getToken } = useAuth();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const { loading, error, data, refetch } = useQuery(GET_POSTS, {
        variables: {
            start: (currentPage - 1) * pageSize,
            limitForPosts: pageSize,
            limitForCount: 100000000,
            searchTerm: searchQuery
        },
    });

    const [deletePostMutation] = useMutation(DELETE_POST);

    useEffect(() => {
        if (searchQuery) {
            refetch();
        }
    }, [currentPage, searchQuery]);

    const handleCheckboxChange = (postId) => {
        if (selectedPosts.includes(postId)) {
            setSelectedPosts(selectedPosts.filter(id => id !== postId));
        } else {
            setSelectedPosts([...selectedPosts, postId]);
        }
    };

    const deleteSelectedPosts = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete selected posts?");
        if (confirmDelete) {
            const token = getToken();
            try {
                await Promise.all(selectedPosts.map(postId => deletePostMutation({
                    variables: {
                        id: postId
                    },
                    context: {
                        headers: {
                            Authorization: token ? `Bearer ${token}` : ''
                        }
                    }
                })));

                setSelectedPosts([]); // Clear selected posts after deletion
                setDeleteSuccess(true); // Show delete success message
                refetch(); // Refetch posts after deletion
            } catch (error) {
                console.error("Error deleting selected posts:", error.message);
            }
        }
    };

    useEffect(() => {
        // Hide delete success message after a delay
        if (deleteSuccess) {
            const timer = setTimeout(() => {
                setDeleteSuccess(false);
            }, 3000); // Show message for 3 seconds

            return () => clearTimeout(timer);
        }
    }, [deleteSuccess]);

    if (loading) return null;
    if (error) return <p>Error: {error.message}</p>;

    const posts = data.posts;
    const totalCount = data.postsConnection.aggregate.count;
    const totalPages = Math.ceil(totalCount / pageSize);

    const nextPage = () => {
        setCurrentPage(currentPage + 1);
    };

    const prevPage = () => {
        setCurrentPage(currentPage - 1);
    };

    const setPage = (page) => {
        setCurrentPage(page);
    };

    const formatArabicDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ar', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            timeZone: 'UTC'
        });
    };

    const deletePost = async (postId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this post?");
        if (confirmDelete) {
            const token = getToken();
            try {
                await deletePostMutation({
                    variables: {
                        id: postId
                    },
                    context: {
                        headers: {
                            Authorization: token ? `Bearer ${token}` : ''
                        }
                    }
                });
                setDeleteSuccess(true); // Show delete success message
                refetch(); // Refetch posts after deletion
            } catch (error) {
                console.error("Error deleting post:", error.message);
            }
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setSearchQuery(searchTerm);
        }
    };

    const pageNumbers = [];
    const maxPagesToShow = 5;
    const middlePage = Math.ceil(maxPagesToShow / 2);
    let startPage = currentPage <= middlePage ? 1 : currentPage - middlePage + 1;
    let endPage = startPage + maxPagesToShow - 1;
    if (endPage > totalPages) {
        endPage = totalPages;
        startPage = endPage - maxPagesToShow + 1;
        if (startPage < 1) {
            startPage = 1;
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(
            <button
                key={i}
                onClick={() => setPage(i)}
                className={currentPage == i ? "act-num page-num" : "page-num "}
            >
                {i}
            </button>
        );
    }

    return (
        <>
            <main className="head">
                <input
                    type="text"
                    className='search'
                    placeholder='البحث'
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleSearch}
                />
                <div className="head-title">
                    <h3 className="title">المقالات:{totalCount}</h3>
                    <Link href="/dashboard/posts/new-post" className="addButton">اضافة مقالة جديدة</Link>
                </div>

                {selectedPosts.length > 0 && (
                    <button className='delete-button' onClick={deleteSelectedPosts}>
                        <MdDelete />
                        حذف جميع المختار
                    </button>
                )}

                {deleteSuccess && <div className="success-message">تم الحذف بنجاح</div>}

                <table className="table">
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={selectedPosts.length === posts.length}
                                    onChange={() => {
                                        if (selectedPosts.length === posts.length) {
                                            setSelectedPosts([]);
                                        } else {
                                            setSelectedPosts(posts.map(post => post.id));
                                        }
                                    }}
                                />
                            </th>
                            <th>اسم المقالة</th>
                            <th>Slug</th>
                            <th>القسم</th>
                            <th>حالة المقالة</th>
                            <th>تاريخ النشر</th>
                            <th>الاعدادات</th>
                        </tr>
                    </thead>
                    <tbody>
                        {posts.map(item => (
                            <tr key={item.id}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedPosts.includes(item.id)}
                                        onChange={() => handleCheckboxChange(item.id)}
                                    />
                                </td>
                                <td>{item.title}</td>
                                <td>{item.slug}</td>
                                <td>{item.category}</td>
                                {!item.published ? <td>مسودة</td> : <td>منشور</td>}
                                <td>{formatArabicDate(item.createdAt)}</td>
                                <td>
                                    <Link href={`/dashboard/posts/${item.id}`}>
                                        <MdOutlineEdit style={{ color: " #4D4F5C" }} />
                                    </Link>
                                    <RiDeleteBin6Line onClick={() => deletePost(item.id)} className='delete' style={{ margin: "0px 10px" }} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="pagination">
                    <button className='arrow' onClick={prevPage} disabled={currentPage === 1}><MdKeyboardArrowRight /></button>
                    {pageNumbers}
                    <button className='arrow' onClick={nextPage} disabled={currentPage === totalPages}><MdKeyboardArrowLeft /></button>
                </div>
            </main >
        </>
    );
}
