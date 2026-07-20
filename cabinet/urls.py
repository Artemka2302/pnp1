from django.urls import path
from cabinet.views import profile, requests, login_view, logout_view, register, edit


app_name = 'cabinet'

urlpatterns = [
    path('profile/', profile, name='profile'),
    path('requests/', requests, name='requests'),
    path('', profile, name='index'),
    path('login/', login_view, name='login'),
    path('logout/', logout_view, name='logout'),
    path('register/',register ,name='register'),
    path('edit/', edit, name='edit')
    ]