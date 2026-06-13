from django.contrib import admin

from .models import CVDownload, DonationCard, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'headline', 'phone', 'location', 'updated_at')
    search_fields = ('user__username', 'user__email', 'headline', 'phone', 'location')


@admin.register(CVDownload)
class CVDownloadAdmin(admin.ModelAdmin):
    list_display = ('title', 'template_slug', 'user', 'language', 'downloaded_at')
    list_filter = ('template_slug', 'language', 'downloaded_at')
    search_fields = ('title', 'template_slug', 'user__username', 'user__email')


@admin.register(DonationCard)
class DonationCardAdmin(admin.ModelAdmin):
    list_display = ('cardholder_name', 'card_number', 'bank_name', 'is_active', 'order')
    list_editable = ('is_active', 'order')
    list_filter = ('is_active',)
    search_fields = ('cardholder_name', 'card_number', 'bank_name')
