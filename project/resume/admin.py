from django.contrib import admin

from .models import CVDownload, UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'headline', 'phone', 'location', 'updated_at')
    search_fields = ('user__username', 'user__email', 'headline', 'phone', 'location')


@admin.register(CVDownload)
class CVDownloadAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'language', 'downloaded_at')
    list_filter = ('language', 'downloaded_at')
    search_fields = ('title', 'user__username', 'user__email')
