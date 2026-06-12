from django.urls import path
from .views import *

app_name = 'resume'

urlpatterns = [
    path('', demo, name='demo'),
    path('login/', auth_view, {'mode': 'login'}, name='login'),
    path('register/', auth_view, {'mode': 'register'}, name='register'),
    path('logout/', logout_view, name='logout'),
    path('profile/', profile_view, name='profile'),
    path('template/<slug:slug>/', template_detail, name='template_detail'),
    path('downloads/record/', record_download, name='record_download'),
    path('downloads/<int:pk>/', download_detail, name='download_detail'),
    path('downloads/<int:pk>/snapshot/', download_snapshot, name='download_snapshot'),
]
