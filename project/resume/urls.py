from django.urls import path
from .views import *

app_name = 'resume'

urlpatterns = [
    path('', demo, name='demo'),
    path('login/', login_view, name='login'),
    path('register/', register_view, name='register'),
    path('logout/', logout_view, name='logout'),
    path('profile/', profile_view, name='profile'),
    path('template/<slug:slug>/', template_detail, name='template_detail'),
    path('downloads/record/', record_download, name='record_download'),
]
