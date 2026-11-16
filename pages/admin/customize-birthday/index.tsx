"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import useAuthStore from "@/store/authStore";
import { getBirthdayTemplate, saveBirthdayTemplate, type BirthdayTemplate } from "@/services/birthdayTemplate";
import BirthdayWishModal from "@/components/modals/BirthdayWishModal";

export default function CustomizeBirthdayPage() {
    const token = useAuthStore((state) => state.token);
    const user = useAuthStore((state) => state.user);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [formData, setFormData] = useState({
        text: "Happy Birthday, {name}! 🎉",
        fontSize: 24,
        fontFamily: "Verdana, sans-serif",
        fontStyle: "normal",
        color: "#ded3d3",
    });

    useEffect(() => {
        loadTemplate();
        loadUserProfile();
    }, []);

    const loadUserProfile = async () => {
        if (!token) return;
        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/user`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        token,
                    },
                }
            );
            if (response.ok) {
                const data = await response.json();
                setUserProfile(data.data);
            }
        } catch (error) {
            console.error("Failed to load user profile:", error);
        }
    };

    const loadTemplate = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const data = await getBirthdayTemplate(token);
            if (data) {
                setFormData({
                    text: data.text,
                    fontSize: data.fontSize,
                    fontFamily: data.fontFamily || "inherit",
                    fontStyle: data.fontStyle || "bold",
                    color: data.color,
                });
            }
        } catch (error: any) {
            console.error("Failed to load template:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) return;

        setSaving(true);
        try {
            await saveBirthdayTemplate(token, formData);
            toast.success("Birthday template saved successfully!");
            await loadTemplate();
        } catch (error: any) {
            toast.error(error.message || "Failed to save template");
        } finally {
            setSaving(false);
        }
    };

    const previewTemplate = useMemo<BirthdayTemplate | null>(() => {
        if (!showPreview) return null;
        const fontWeight = formData.fontStyle.includes("bold") ? "bold" : "normal";
        const fontStyleValue = formData.fontStyle.includes("italic") ? "italic" : "normal";
        const html = `<div style="font-family: ${formData.fontFamily}; font-size: ${formData.fontSize}px; font-weight: ${fontWeight}; font-style: ${fontStyleValue}; color: ${formData.color}; text-align: center; line-height: 1.2;">${formData.text}</div>`;

        return {
            id: 0,
            text: formData.text,
            fontSize: formData.fontSize,
            fontFamily: formData.fontFamily,
            fontStyle: formData.fontStyle,
            color: formData.color,
            html: html,
        };
    }, [formData, showPreview]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500"></div>
            </div>
        );
    }

    return (
        <>
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                    Customize Birthday Message
                </h1>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Birthday Message
                            </label>
                            <textarea
                                value={formData.text}
                                onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                rows={12}
                                required
                            />
                            <p className="mt-1 text-sm text-gray-500">
                                Example: "Happy Birthday, {"{name}"}!" or "Wishing {"{name}"} a wonderful day!"
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Font Size (px)
                            </label>
                            <input
                                type="number"
                                value={formData.fontSize}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (!isNaN(value) && value > 0) {
                                        setFormData({ ...formData, fontSize: value });
                                    } else if (e.target.value === "") {
                                        setFormData({ ...formData, fontSize: 0 });
                                    }
                                }}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                min="1"
                                max="120"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Font Family
                            </label>
                            <select
                                value={formData.fontFamily}
                                onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            >
                                <option value="inherit">Inherit (Default)</option>
                                <option value="Arial, sans-serif">Arial</option>
                                <option value="'Times New Roman', serif">Times New Roman</option>
                                <option value="'Courier New', monospace">Courier New</option>
                                <option value="Georgia, serif">Georgia</option>
                                <option value="Verdana, sans-serif">Verdana</option>
                                <option value="'Trebuchet MS', sans-serif">Trebuchet MS</option>
                                <option value="Impact, sans-serif">Impact</option>
                                <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
                                <option value="'Lucida Console', monospace">Lucida Console</option>
                                <option value="Tahoma, sans-serif">Tahoma</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Font Style
                            </label>
                            <select
                                value={formData.fontStyle}
                                onChange={(e) => setFormData({ ...formData, fontStyle: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                required
                            >
                                <option value="normal">Normal</option>
                                <option value="bold">Bold</option>
                                <option value="italic">Italic</option>
                                <option value="bold italic">Bold Italic</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Text Color
                            </label>
                            <div className="flex gap-4 items-center">
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="w-20 h-10 border border-gray-300 rounded cursor-pointer"
                                />
                                <input
                                    type="text"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="#ffffff"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-4">
                            <button
                                type="button"
                                onClick={() => setShowPreview(true)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Preview Card
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-gold-600 text-white rounded-lg hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? "Saving..." : "Save Template"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Preview Modal - Using actual BirthdayWishModal */}
            {previewTemplate && (
                <BirthdayWishModal
                    isOpen={showPreview}
                    onClose={() => setShowPreview(false)}
                    userName={userProfile?.name || user?.name || "John Doe"}
                    profilePicture={userProfile?.profile?.profilePicture}
                    dateOfBirth={userProfile?.membership?.dateOfBirth || null}
                    template={previewTemplate}
                />
            )}
        </>
    );
}

